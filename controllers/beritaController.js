const BaseController = require('./BaseController');
const { DraftBerita, DokumentasiBerita, User, Penugasan, Agenda, AgendaPimpinan, PeriodeJabatan, Pimpinan, RevisiDraftBerita, sequelize } = require('../models');
const { sendPushNotification } = require('../helpers/pushNotificationHelper');

class BeritaController extends BaseController {
    /**
     * Get approved berita for public landing page (no auth required)
     */
    async getPublicBerita(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            const { count, rows: berita } = await DraftBerita.findAndCountAll({
                where: { status_draft: 'approved' },
                include: [
                    {
                        model: DokumentasiBerita,
                        as: 'dokumentasis'
                    }
                ],
                order: [['tanggal_kirim', 'DESC']],
                limit: limit,
                offset: offset,
                distinct: true // Important when using findAndCountAll with includes
            });

            return this.sendResponse(res, 200, true, 'Berita berhasil diambil', {
                data: berita,
                pagination: {
                    totalItems: count,
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    limit: limit
                }
            });
        } catch (error) {
            return this.sendError(res, error, 'Gagal mengambil berita');
        }
    }

    /**
     * Get approved berita detail for public page
     */
    async getPublicBeritaDetail(req, res) {
        try {
            const { id } = req.params;
            const berita = await DraftBerita.findOne({
                where: { id_draft_berita: id, status_draft: 'approved' },
                include: [
                    {
                        model: DokumentasiBerita,
                        as: 'dokumentasis'
                    },
                    {
                        model: User,
                        as: 'staff',
                        attributes: ['nama']
                    }
                ]
            });

            if (!berita) {
                return this.sendResponse(res, 404, false, 'Berita tidak ditemukan');
            }

            return this.sendResponse(res, 200, true, 'Detail berita berhasil diambil', berita);
        } catch (error) {
            return this.sendError(res, error, 'Gagal mengambil detail berita');
        }
    }

    /**
     * Helper to generate Draft Berita ID
     */
    async generateDraftId() {
        const lastDraft = await DraftBerita.findOne({
            order: [['id_draft_berita', 'DESC']],
            attributes: ['id_draft_berita']
        });

        let nextNum = 1;
        if (lastDraft && lastDraft.id_draft_berita.startsWith('DB')) {
            const num = parseInt(lastDraft.id_draft_berita.substring(2));
            if (!isNaN(num)) nextNum = num + 1;
        }

        return `DB${nextNum.toString().padStart(3, '0')}`;
    }

    /**
     * Helper to generate Dokumentasi ID
     */
    async generateDokumentasiId() {
        const lastDok = await DokumentasiBerita.findOne({
            order: [['id_dokumentasi', 'DESC']],
            attributes: ['id_dokumentasi']
        });

        let nextNum = 1;
        if (lastDok && lastDok.id_dokumentasi.startsWith('DK')) {
            const num = parseInt(lastDok.id_dokumentasi.substring(2));
            if (!isNaN(num)) nextNum = num + 1;
        }

        return `DK${nextNum.toString().padStart(3, '0')}`;
    }

    /**
     * Helper to generate Revisi ID
     */
    async generateRevisiId() {
        const lastRev = await RevisiDraftBerita.findOne({
            order: [['id_revisi', 'DESC']],
            attributes: ['id_revisi']
        });

        let nextNum = 1;
        if (lastRev && lastRev.id_revisi.startsWith('REV')) {
            const num = parseInt(lastRev.id_revisi.substring(3));
            if (!isNaN(num)) nextNum = num + 1;
        }

        return `REV${nextNum.toString().padStart(3, '0')}`;
    }

    /**
     * Submit draft berita (Staff Media)
     */
    async submitDraftBerita(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const { id_penugasan, judul_berita, isi_draft } = req.body;
            const { id_user } = req.user;

            if (!id_penugasan || !judul_berita || !isi_draft) {
                await transaction.rollback();
                return this.sendResponse(res, 400, false, 'Mohon lengkapi semua field yang diperlukan');
            }

            // Check if penugasan exists
            const penugasan = await Penugasan.findByPk(id_penugasan, {
                include: [{ model: Agenda, as: 'agenda', attributes: ['tanggal_kegiatan'] }],
                transaction
            });
            if (!penugasan) {
                await transaction.rollback();
                return this.sendResponse(res, 404, false, 'Penugasan tidak ditemukan');
            }

            // Verify if today is >= agenda date
            const today = new Date().toISOString().split('T')[0];
            const agendaDate = penugasan.agenda?.tanggal_kegiatan;

            if (agendaDate && today < agendaDate) {
                await transaction.rollback();
                return this.sendResponse(res, 403, false, `Draft berita hanya dapat diserahkan pada hari H (${agendaDate}) atau setelah kegiatan berlangsung`);
            }

            // Cek apakah draft sudah ada untuk penugasan ini
            let draft = await DraftBerita.findOne({ where: { id_penugasan, id_user_staff: id_user } });
            let id_draft_berita;

            if (draft) {
                // Update draft yang sudah ada
                id_draft_berita = draft.id_draft_berita;
                await draft.update({
                    judul_berita,
                    isi_draft,
                    status_draft: 'draft', // Status awal/revisi: draft
                    tanggal_kirim: new Date()
                }, { transaction });
            } else {
                // Buat draft baru
                id_draft_berita = await this.generateDraftId();
                draft = await DraftBerita.create({
                    id_draft_berita,
                    id_penugasan,
                    id_user_staff: id_user,
                    judul_berita,
                    isi_draft,
                    status_draft: 'draft',
                    tanggal_kirim: new Date()
                }, { transaction });
            }

            // Hapus dokumentasi lama jika ada di deleted_dokumentasi_ids
            let deletedIds = [];
            if (req.body.deleted_dokumentasi_ids) {
                try {
                    deletedIds = JSON.parse(req.body.deleted_dokumentasi_ids);
                } catch (e) {
                    if (Array.isArray(req.body.deleted_dokumentasi_ids)) {
                        deletedIds = req.body.deleted_dokumentasi_ids;
                    } else if (typeof req.body.deleted_dokumentasi_ids === 'string') {
                        deletedIds = [req.body.deleted_dokumentasi_ids];
                    }
                }
            }

            if (deletedIds.length > 0) {
                // Hapus dari database (file di disk bisa dihapus di background jika perlu, untuk sekarang hapus DB)
                await DokumentasiBerita.destroy({
                    where: {
                        id_dokumentasi: deletedIds,
                        id_draft_berita: id_draft_berita
                    },
                    transaction
                });
            }

            // Handle file uploads
            if (req.files && req.files.length > 0) {
                const dokumentasis = [];
                for (const file of req.files) {
                    const id_dokumentasi = await this.generateDokumentasiId();
                    dokumentasis.push({
                        id_dokumentasi,
                        id_draft_berita,
                        file_path: file.filename
                    });
                    // Manual increment for bulk create simulation if needed, 
                    // or just await each for simplicity in this case since DK IDs are sequential strings
                }
                
                // Since generateDokumentasiId might return same ID if called in parallel fast, 
                // let's do it sequentially for IDs
                const uniqueDokumentasis = [];
                let currentNum = parseInt((await this.generateDokumentasiId()).substring(2));
                
                for (const file of req.files) {
                    uniqueDokumentasis.push({
                        id_dokumentasi: `DK${String(currentNum++).padStart(3, '0')}`,
                        id_draft_berita,
                        file_path: file.filename
                    });
                }
                
                await DokumentasiBerita.bulkCreate(uniqueDokumentasis, { transaction });
            }

            // Update penugasan status to progress if it was pending
            if (penugasan.status === 'pending') {
                await penugasan.update({ status: 'progress' }, { transaction });
            }

            await transaction.commit();
            return this.sendResponse(res, 201, true, 'Draft berita berhasil diserahkan', draft);
        } catch (error) {
            if (transaction) await transaction.rollback();
            return this.sendError(res, error, 'Gagal menyerahkan draft berita');
        }
    }

    /**
     * Get all drafts for review (Kasubag Media)
     */
    async getDraftsReview(req, res) {
        try {
            const drafts = await DraftBerita.findAll({
                where: { status_draft: 'draft' }, // Mencari yang berstatus draft (kiriman staf)
                include: [
                    { model: User, as: 'staff', attributes: ['nama'] },
                    { 
                        model: Penugasan, 
                        as: 'penugasan',
                        include: [{ model: Agenda, as: 'agenda', attributes: ['nama_kegiatan', 'tanggal_kegiatan', 'lokasi_kegiatan'] }]
                    },
                    { model: DokumentasiBerita, as: 'dokumentasis', attributes: ['id_dokumentasi', 'file_path'] },
                    { model: RevisiDraftBerita, as: 'revisies' }
                ],
                order: [['tanggal_kirim', 'DESC']]
            });
            return this.sendResponse(res, 200, true, 'Data draft review berhasil diambil', drafts);
        } catch (error) {
            return this.sendError(res, error, 'Gagal mengambil data draft review');
        }
    }

    /**
     * Get all drafts for Kasubag Media (all statuses)
     */
    async getAllDrafts(req, res) {
        try {
            const drafts = await DraftBerita.findAll({
                include: [
                    { model: User, as: 'staff', attributes: ['nama'] },
                    { 
                        model: Penugasan, 
                        as: 'penugasan',
                        include: [{ model: Agenda, as: 'agenda', attributes: ['nama_kegiatan', 'tanggal_kegiatan', 'lokasi_kegiatan'] }]
                    },
                    { model: DokumentasiBerita, as: 'dokumentasis', attributes: ['id_dokumentasi', 'file_path'] },
                    { model: RevisiDraftBerita, as: 'revisies' }
                ],
                order: [['tanggal_kirim', 'DESC']]
            });
            return this.sendResponse(res, 200, true, 'Semua data draft berita berhasil diambil', drafts);
        } catch (error) {
            return this.sendError(res, error, 'Gagal mengambil semua data draft berita');
        }
    }

    /**
     * Get my drafts (for Staff Media)
     */
    async getMyDrafts(req, res) {
        try {
            const drafts = await DraftBerita.findAll({
                where: { id_user_staff: req.user.id_user }, // Changed from id_user to id_user_staff based on model
                include: [
                    { 
                        model: Penugasan, 
                        as: 'penugasan',
                        include: [{ model: Agenda, as: 'agenda', attributes: ['nama_kegiatan', 'tanggal_kegiatan', 'lokasi_kegiatan'] }]
                    },
                    { model: DokumentasiBerita, as: 'dokumentasis', attributes: ['id_dokumentasi', 'file_path'] },
                    { model: RevisiDraftBerita, as: 'revisies' }
                ],
                order: [['tanggal_kirim', 'DESC']]
            });
            return this.sendResponse(res, 200, true, 'Data draft berita saya berhasil diambil', drafts);
        } catch (error) {
            return this.sendError(res, error, 'Gagal mengambil data draft berita saya');
        }
    }

    /**
     * Get draft detail by ID
     */
    async getDraftDetail(req, res) {
        try {
            const { id } = req.params;
            const draft = await DraftBerita.findByPk(id, {
                include: [
                    { model: User, as: 'staff', attributes: ['nama', 'email'] },
                    { model: DokumentasiBerita, as: 'dokumentasis' },
                    { model: RevisiDraftBerita, as: 'revisies' },
                    { 
                        model: Penugasan, 
                        as: 'penugasan',
                        include: [
                            { 
                                model: Agenda, 
                                as: 'agenda',
                                include: [
                                    {
                                        model: AgendaPimpinan,
                                        as: 'agendaPimpinans',
                                        include: [
                                            {
                                                model: PeriodeJabatan,
                                                as: 'periodeJabatan',
                                                include: [{ model: Pimpinan, as: 'pimpinan' }]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });

            if (!draft) return this.sendResponse(res, 404, false, 'Draft berita tidak ditemukan');
            return this.sendResponse(res, 200, true, 'Detail draft berita berhasil diambil', draft);
        } catch (error) {
            return this.sendError(res, error, 'Gagal mengambil detail draft berita');
        }
    }

    /**
     * Review draft (Approve or Revise)
     */
    async reviewDraft(req, res) {
        try {
            const { id } = req.params;
            const { status_draft, catatan } = req.body; // approved or review

            if (!['approved', 'review'].includes(status_draft)) {
                return this.sendResponse(res, 400, false, 'Status tidak valid');
            }

            const draft = await DraftBerita.findByPk(id);
            if (!draft) return this.sendResponse(res, 404, false, 'Draft berita tidak ditemukan');

            await draft.update({ status_draft, catatan });

            // Create revision log if status is review (needs revision)
            if (status_draft === 'review') {
                const id_revisi = await this.generateRevisiId();
                await RevisiDraftBerita.create({
                    id_revisi,
                    id_draft_berita: id,
                    catatan_revisi: catatan,
                    tanggal_revisi: new Date()
                });
            }

            // Notify staff about the review outcome
            const notificationPayload = {
                title: status_draft === 'approved' ? 'Berita Disetujui' : 'Revisi Berita Diperlukan',
                body: status_draft === 'approved' 
                    ? `Draft berita "${draft.judul_berita}" telah disetujui.`
                    : `Draft berita "${draft.judul_berita}" membutuhkan revisi: ${catatan || 'Cek detail revisi.'}`,
                data: {
                    url: '/staff-media/draft-berita',
                    id_draft_berita: draft.id_draft_berita,
                    status: status_draft
                }
            };

            await sendPushNotification(draft.id_user_staff, notificationPayload);

            const message = status_draft === 'approved' ? 'Draft berita berhasil disetujui' : 'Draft berita berhasil dikirim kembali untuk revisi';
            return this.sendResponse(res, 200, true, message, draft);
        } catch (error) {
            return this.sendError(res, error, 'Gagal mereview draft berita');
        }
    }
}

module.exports = new BeritaController();
