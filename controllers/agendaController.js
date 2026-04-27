const BaseController = require('./BaseController');
const { Agenda, StatusAgenda, AgendaPimpinan, SlotAgendaPimpinan, PeriodeJabatan, SlotAgendaStaff, JabatanPimpinan, Pimpinan, SlotWaktu, User, PimpinanAjudan, Penugasan, LaporanKegiatan, Role, KASKPDPendamping,KASKPD, sequelize } = require('../models');
const { Op } = require('sequelize');
const googleCalendarHelper = require('../helpers/googleCalendarHelper');
const { sendPushNotification } = require('../helpers/pushNotificationHelper');

class AgendaController extends BaseController {
    async generateAgendaId(transaction = null) {
        const lastRecord = await Agenda.findOne({
            where: {
                id_agenda: {
                    [Op.like]: 'AG%'
                }
            },
            order: [['id_agenda', 'DESC']],
            attributes: ['id_agenda'],
            transaction,
            lock: transaction ? transaction.LOCK.UPDATE : false
        });

        let nextNum = 1;
        if (lastRecord) {
            const num = parseInt(lastRecord.id_agenda.substring(2));
            if (!isNaN(num)) nextNum = num + 1;
        }

        return `AG${nextNum.toString().padStart(3, '0')}`;
    }


    async generateStatusAgendaId(transaction = null) {
        const lastRecord = await StatusAgenda.findOne({
            where: {
                id_status_agenda: {
                    [Op.like]: 'SA%'
                }
            },
            order: [['id_status_agenda', 'DESC']],
            attributes: ['id_status_agenda'],
            transaction,
            lock: transaction ? transaction.LOCK.UPDATE : false
        });

        let nextNum = 1;
        if (lastRecord) {
            const num = parseInt(lastRecord.id_status_agenda.substring(2));
            if (!isNaN(num)) nextNum = num + 1;
        }

        return `SA${nextNum.toString().padStart(3, '0')}`;
    }

 
    async createAgenda(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const {
                nomor_surat, tanggal_surat, perihal,
                nama_kegiatan, lokasi_kegiatan,
                invited_pimpinan, // Array of { id_jabatan, id_periode }
                waktu_mulai, waktu_selesai, tanggal_kegiatan
            } = req.body;

            // Handle stringified arrays if sent via FormData
            const parsedPimpinan = typeof invited_pimpinan === 'string' ? JSON.parse(invited_pimpinan) : invited_pimpinan;

            const id_user_pemohon = req.user.id_user;

            if (!nomor_surat || !perihal || !nama_kegiatan || !waktu_mulai || !waktu_selesai || !tanggal_kegiatan || !req.file) {
                await transaction.rollback();
                const errorMsg = !req.file ? 'Surat permohonan wajib diupload' : 'Nomor surat, perihal, nama kegiatan, dan waktu kegiatan wajib diisi';
                return this.sendResponse(res, 400, false, errorMsg);
            }

            if (req.file && req.file.size > 5 * 1024 * 1024) {
                await transaction.rollback();
                return this.sendResponse(res, 400, false, 'Ukuran file surat permohonan maksimal 5 MB');
            }

            // Date validation (must be in the future - after today)
            const today = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ')[0];
            if (tanggal_kegiatan <= today) {
                await transaction.rollback();
                return this.sendResponse(res, 400, false, 'Tanggal kegiatan harus setelah hari ini (minimal besok)');
            }

            // Time validation (end time must be after start time)
            if (waktu_selesai <= waktu_mulai) {
                await transaction.rollback();
                return this.sendResponse(res, 400, false, 'Waktu selesai tidak boleh lebih awal dari waktu mulai.');
            }

            const id_agenda = await this.generateAgendaId(transaction);
            const id_status_agenda = await this.generateStatusAgendaId(transaction);

            // Validasi keunikan nomor surat per user (instansi)
            const existingAgenda = await Agenda.findOne({
                where: {
                    nomor_surat: nomor_surat,
                    id_user_pemohon: id_user_pemohon
                },
                transaction
            });

            if (existingAgenda) {
                await transaction.rollback();
                return this.sendResponse(res, 400, false, `Nomor surat "${nomor_surat}" sudah pernah Anda gunakan untuk permohonan lain.`);
            }

            const surat_permohonan = req.file ? req.file.path : null;

            const newAgenda = await Agenda.create({
                id_agenda,
                id_user_pemohon,
                nomor_surat,
                tanggal_surat,
                perihal,
                surat_permohonan,
                tanggal_pengajuan: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ')[0],
                tanggal_kegiatan,
                waktu_mulai,
                waktu_selesai,
                nama_kegiatan,
                lokasi_kegiatan
            }, { transaction });

            const isSespri = req.user.nama_role === 'Sespri';

            await StatusAgenda.create({
                id_status_agenda,
                id_agenda: newAgenda.id_agenda,
                id_user_sespri: req.user.id_user,
                status_agenda: isSespri ? 'approved_sespri' : 'pending',
                tanggal_status: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ')[0],
                catatan: isSespri ? 'Agenda ditambahkan langsung oleh Sespri' : 'Permohonan baru diajukan'
            }, { transaction });

            // Create AgendaPimpinan mappings
            if (parsedPimpinan && Array.isArray(parsedPimpinan)) {
                const pimpinanPromises = parsedPimpinan.map(p => AgendaPimpinan.create({
                    id_agenda: newAgenda.id_agenda,
                    id_jabatan: p.id_jabatan,
                    id_periode: p.id_periode,
                    status_kehadiran: null // Initially null
                }, { transaction }));
                await Promise.all(pimpinanPromises);
            }

            await transaction.commit();

            // Notify relevant parties about the new agenda
            if (!isSespri) {
                // Notify all Sespri users about permohonan from Pemohon
                const sespriUsers = await User.findAll({
                    include: [{
                        model: Role,
                        as: 'role',
                        where: { nama_role: 'Sespri' }
                    }]
                });

                const notificationPayload = {
                    title: 'Permohonan Agenda Baru',
                    body: `Agenda "${newAgenda.nama_kegiatan}" telah diajukan oleh ${req.user.nama}.`,
                    data: {
                        url: '/sespri/verifikasi-permohonan',
                        id_agenda: newAgenda.id_agenda
                    }
                };

                for (const user of sespriUsers) {
                    await sendPushNotification(user.id_user, notificationPayload);
                }
            } else {
                // Notify Ajudans when Sespri creates agenda directly
                try {
                    if (parsedPimpinan && Array.isArray(parsedPimpinan)) {
                        const pimpinanCriteria = parsedPimpinan.map(p => ({
                            id_jabatan: p.id_jabatan,
                            id_periode: p.id_periode
                        }));

                        const pimpinanAjudans = await PimpinanAjudan.findAll({
                            where: {
                                [Op.or]: pimpinanCriteria,
                                status_aktif: 'aktif'
                            }
                        });

                        const uniqueAjudanIds = [...new Set(pimpinanAjudans.map(pa => pa.id_user_ajudan))];
                        
                        const ajudanNotificationPayload = {
                            title: 'Agenda Baru ditambahkan Sespri',
                            body: `Agenda "${newAgenda.nama_kegiatan}" memerlukan konfirmasi kehadiran pimpinan.`,
                            data: {
                                url: '/ajudan/konfirmasi-agenda',
                                id_agenda: newAgenda.id_agenda,
                                status: 'approved_sespri'
                            }
                        };

                        for (const id_user_ajudan of uniqueAjudanIds) {
                            await sendPushNotification(id_user_ajudan, ajudanNotificationPayload);
                        }
                    }
                } catch (notifError) {
                    console.error('Error sending direct agenda notifications to Ajudan:', notifError);
                }
            }

            return this.sendResponse(res, 201, true, 'Agenda berhasil diajukan', newAgenda);
        } catch (error) {
            await transaction.rollback();
            return this.sendError(res, error, 'Gagal mengajukan agenda');
        }
    }


    async getSlots(req, res) {
        try {
            const slots = await SlotWaktu.findAll({
                order: [['nomor_urut', 'ASC']]
            });
            return this.sendResponse(res, 200, true, 'Data slot waktu berhasil diambil', slots);
        } catch (error) {
            return this.sendError(res, error, 'Gagal mengambil data slot waktu');
        }
    }


    async getMyAgendas(req, res) {
        try {
            const id_user_pemohon = req.user.id_user;
            
            const agendas = await Agenda.findAll({
                where: { id_user_pemohon },
                include: [
                    {
                        model: StatusAgenda,
                        as: 'statusAgendas',
                        order: [['createdAt', 'DESC']],
                        include: [
                            {
                                model: User,
                                as: 'sespri',
                                attributes: ['id_user', 'nama']
                            }
                        ]
                    },
                    {
                        model: AgendaPimpinan,
                        as: 'agendaPimpinans',
                        include: [
                            {
                                model: PeriodeJabatan,
                                as: 'periodeJabatan',
                                on: {
                                    id_jabatan: { [Op.col]: 'agendaPimpinans.id_jabatan' },
                                    id_periode: { [Op.col]: 'agendaPimpinans.id_periode' }
                                },
                                include: [
                                    {
                                        model: JabatanPimpinan,
                                        as: 'jabatan'
                                    },
                                    {
                                        model: Pimpinan,
                                        as: 'pimpinan',
                                        attributes: ['id_pimpinan', 'nama_pimpinan']
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        model: KASKPDPendamping,
                        as: 'kaskpdPendampings',
                        include: [{
                            model: KASKPD,
                            as: 'kaskpd',
                            attributes: ['id_ka_skpd', 'nama_instansi']
                        }]
                    }
                ],
                order: [['updatedAt', 'DESC']]
            });

            return this.sendResponse(res, 200, true, 'Data agenda berhasil diambil', agendas);
        } catch (error) {
            return this.sendError(res, error, 'Gagal mengambil data agenda');
        }
    }

    async getAllAgendas(req, res) {
        try {
            const agendas = await Agenda.findAll({
                include: [
                    {
                        model: User,
                        as: 'pemohon',
                        attributes: ['id_user', 'nama', 'email', 'instansi', 'jabatan', 'no_hp']
                    },
                    {
                        model: StatusAgenda,
                        as: 'statusAgendas',
                        order: [['createdAt', 'DESC']],
                        include: [
                            {
                                model: User,
                                as: 'sespri',
                                attributes: ['id_user', 'nama']
                            }
                        ]
                    },
                    {
                        model: AgendaPimpinan,
                        as: 'agendaPimpinans',
                        include: [
                            {
                                model: PeriodeJabatan,
                                as: 'periodeJabatan',
                                on: {
                                    id_jabatan: { [Op.col]: 'agendaPimpinans.id_jabatan' },
                                    id_periode: { [Op.col]: 'agendaPimpinans.id_periode' }
                                },
                                include: [
                                    {
                                        model: JabatanPimpinan,
                                        as: 'jabatan'
                                    },
                                    {
                                        model: Pimpinan,
                                        as: 'pimpinan',
                                        attributes: ['id_pimpinan', 'nama_pimpinan']
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        model: KASKPDPendamping,
                        as: 'kaskpdPendampings',
                        include: [{
                            model: KASKPD,
                            as: 'kaskpd',
                            attributes: ['id_ka_skpd', 'nama_instansi']
                        }]
                    }
                ],
                order: [['updatedAt', 'DESC']]
            });

            return this.sendResponse(res, 200, true, 'Data agenda berhasil diambil', agendas);
        } catch (error) {
            return this.sendError(res, error, 'Gagal mengambil data agenda');
        }
    }


    async verifyAgenda(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const { id_agenda } = req.params;
            const { status, catatan } = req.body;

            const validStatuses = [
                'pending', 'revision', 'rejected_sespri', 'approved_sespri', 
                'approved_ajudan', 'delegated', 'rejected_ajudan', 
                'canceled', 'completed'
            ];
            if (!validStatuses.includes(status)) {
                await transaction.rollback();
                return this.sendResponse(res, 400, false, `Status tidak valid.`);
            }

            // Check if agenda exists
            const agenda = await Agenda.findByPk(id_agenda, { transaction });
            if (!agenda) {
                await transaction.rollback();
                return this.sendResponse(res, 404, false, 'Agenda tidak ditemukan');
            }

            const id_status_agenda = await this.generateStatusAgendaId(transaction);

            const newStatus = await StatusAgenda.create({
                id_status_agenda,
                id_agenda,
                id_user_sespri: req.user.id_user,
                status_agenda: status,
                tanggal_status: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ')[0],
                catatan: catatan || `Status diperbarui oleh Sespri via verifikasi: ${status}`
            }, { transaction });

            // Touch Agenda record to update its updatedAt timestamp for activity-based sorting
            await agenda.update({ updatedAt: new Date() }, { transaction });

            await transaction.commit();

            // Notify Pemohon about the status update
            if (agenda.id_user_pemohon) {
                const statusLabels = {
                    'approved_sespri': 'Disetujui Sespri',
                    'approved_ajudan': 'Disetujui Ajudan',
                    'rejected_sespri': 'Ditolak Sespri',
                    'rejected_ajudan': 'Ditolak Ajudan',
                    'revision': 'Butuh Revisi',
                    'delegated': 'Delegasikan',
                    'canceled': 'Dibatalkan',
                    'completed': 'Selesai'
                };

                const currentStatusLabel = statusLabels[status] || status;

                await sendPushNotification(agenda.id_user_pemohon, {
                    title: 'Update Status Agenda',
                    body: `Agenda "${agenda.nama_kegiatan}" Anda sekarang berstatus: ${currentStatusLabel}.`,
                    data: {
                        url: '/pemohon/riwayat-permohonan',
                        id_agenda: agenda.id_agenda,
                        status: status
                    }
                });
            }

            // 4. Handle Google Calendar Deletion if agenda is canceled or rejected
            if (['rejected_sespri', 'rejected_ajudan', 'canceled'].includes(status)) {
                try {
                    const agendaPimpinans = await AgendaPimpinan.findAll({
                        where: { id_agenda, google_event_id: { [Op.ne]: null } },
                        include: [
                            { 
                                model: PeriodeJabatan, 
                                as: 'periodeJabatan', 
                                include: [{ model: Pimpinan, as: 'pimpinan' }] 
                            }
                        ]
                    });

                    for (const ap of agendaPimpinans) {
                        const pimpinan = ap.periodeJabatan?.pimpinan;
                        if (pimpinan && pimpinan.is_calendar_synced) {
                            await googleCalendarHelper.deleteEvent(pimpinan, ap.google_event_id);
                            await ap.update({ google_event_id: null });
                        }
                    }
                } catch (syncError) {
                    console.error('Agenda Cancellation Sync Failed:', syncError);
                }
            }

            // 5. Notify Ajudan if status is approved_sespri
            if (status === 'approved_sespri') {
                try {
                    // Find all Pimpinan associated with this agenda
                    const agendaPimpinans = await AgendaPimpinan.findAll({
                        where: { id_agenda }
                    });

                    if (agendaPimpinans.length > 0) {
                        // Find all Ajudans assigned to these Pimpinans
                        const pimpinanCriteria = agendaPimpinans.map(ap => ({
                            id_jabatan: ap.id_jabatan,
                            id_periode: ap.id_periode
                        }));

                        const pimpinanAjudans = await PimpinanAjudan.findAll({
                            where: {
                                [Op.or]: pimpinanCriteria
                            }
                        });

                        // Send notifications to each unique Ajudan
                        const uniqueAjudanIds = [...new Set(pimpinanAjudans.map(pa => pa.id_user_ajudan))];
                        
                        const ajudanNotificationPayload = {
                            title: 'Permohonan Agenda Baru (Perlu Verifikasi)',
                            body: `Agenda "${agenda.nama_kegiatan}" telah disetujui Sespri dan memerlukan verifikasi Anda.`,
                            data: {
                                url: '/ajudan/konfirmasi-agenda',
                                id_agenda: agenda.id_agenda,
                                status: 'approved_sespri'
                            }
                        };

                        for (const id_user_ajudan of uniqueAjudanIds) {
                            await sendPushNotification(id_user_ajudan, ajudanNotificationPayload);
                        }
                    }
                } catch (notifError) {
                    console.error('Error sending notifications to Ajudan:', notifError);
                }
            }

            return this.sendResponse(res, 201, true, `Agenda berhasil diverifikasi dengan status: ${status}`, newStatus);
        } catch (error) {
            await transaction.rollback();
            return this.sendError(res, error, 'Gagal memverifikasi agenda');
        }
    }

    async updateAgenda(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const { id_agenda } = req.params;
            const id_user_pemohon = req.user.id_user;

            const agenda = await Agenda.findByPk(id_agenda, {
                include: [{
                    model: StatusAgenda,
                    as: 'statusAgendas',
                    order: [['createdAt', 'DESC']],
                    limit: 1
                }],
                transaction
            });

            if (!agenda) {
                await transaction.rollback();
                return this.sendResponse(res, 404, false, 'Agenda tidak ditemukan');
            }

            if (agenda.id_user_pemohon !== id_user_pemohon && req.user.nama_role !== 'Sespri') {
                await transaction.rollback();
                return this.sendResponse(res, 403, false, 'Anda tidak memiliki akses untuk mengedit agenda ini');
            }

            const latestStatus = agenda.statusAgendas?.[0]?.status_agenda;
            if (latestStatus !== 'revision' && req.user.nama_role !== 'Sespri') {
                await transaction.rollback();
                return this.sendResponse(res, 400, false, 'Agenda hanya bisa diedit jika status adalah revisi');
            }

            const todayStr = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ')[0];
            
            const {
                nomor_surat, tanggal_surat, perihal,
                nama_kegiatan, lokasi_kegiatan, contact_person, keterangan,
                tanggal_kegiatan, waktu_mulai, waktu_selesai,
                kaskpd_pendamping
            } = req.body;

            // Validasi keunikan nomor surat jika nomor_surat diubah
            if (nomor_surat) {
                const existingAgenda = await Agenda.findOne({
                    where: {
                        nomor_surat,
                        id_user_pemohon: agenda.id_user_pemohon,
                        id_agenda: { [Op.ne]: id_agenda }
                    },
                    transaction
                });

                if (existingAgenda) {
                    await transaction.rollback();
                    return this.sendResponse(res, 400, false, `Nomor surat "${nomor_surat}" sudah digunakan oleh permohonan lain Anda.`);
                }
            }
            
            // Validate tanggal_kegiatan if provided
            if (tanggal_kegiatan && tanggal_kegiatan <= todayStr) {
                await transaction.rollback();
                return this.sendResponse(res, 400, false, 'Tanggal kegiatan harus setelah hari ini (minimal besok)');
            }

            // Validate time range if both provided, or if one is provided use the existing one from the record
            const finalStart = waktu_mulai || agenda.waktu_mulai;
            const finalEnd = waktu_selesai || agenda.waktu_selesai;

            if (finalStart && finalEnd && finalEnd <= finalStart) {
                await transaction.rollback();
                return this.sendResponse(res, 400, false, 'Waktu selesai tidak boleh lebih awal dari waktu mulai.');
            }

            const surat_permohonan = req.file ? req.file.path : undefined;

            if (req.file && req.file.size > 5 * 1024 * 1024) {
                await transaction.rollback();
                return this.sendResponse(res, 400, false, 'Ukuran file surat permohonan maksimal 5 MB');
            }

            const updateData = {};
            if (nomor_surat) updateData.nomor_surat = nomor_surat;
            if (tanggal_surat) updateData.tanggal_surat = tanggal_surat;
            if (perihal) updateData.perihal = perihal;
            if (nama_kegiatan) updateData.nama_kegiatan = nama_kegiatan;
            if (lokasi_kegiatan) updateData.lokasi_kegiatan = lokasi_kegiatan;
            if (contact_person !== undefined) updateData.contact_person = contact_person;
            if (keterangan !== undefined) updateData.keterangan = keterangan;
            if (tanggal_kegiatan) updateData.tanggal_kegiatan = tanggal_kegiatan;
            if (waktu_mulai) updateData.waktu_mulai = waktu_mulai;
            if (waktu_selesai) updateData.waktu_selesai = waktu_selesai;
            if (surat_permohonan) updateData.surat_permohonan = surat_permohonan;

            await agenda.update(updateData, { transaction });

            // Handle KASKPD Pendamping if Sespri
            if (req.user.nama_role === 'Sespri' && kaskpd_pendamping !== undefined) {
                let pendampingIds = kaskpd_pendamping;
                if (typeof kaskpd_pendamping === 'string') {
                    try {
                        pendampingIds = JSON.parse(kaskpd_pendamping);
                    } catch (e) {
                        pendampingIds = [kaskpd_pendamping];
                    }
                }

                if (Array.isArray(pendampingIds)) {
                    // Clear existing
                    await KASKPDPendamping.destroy({
                        where: { id_agenda },
                        transaction
                    });

                    // Create new
                    if (pendampingIds.length > 0) {
                        const pendampingPromises = pendampingIds.map(id_ka_skpd => 
                            KASKPDPendamping.create({
                                id_agenda,
                                id_ka_skpd
                            }, { transaction })
                        );
                        await Promise.all(pendampingPromises);
                    }
                }
            }

            // 4. Background Sync for all confirmed Pimpinans
            try {
                const confirmedAP = await AgendaPimpinan.findAll({
                    where: { id_agenda: agenda.id_agenda, google_event_id: { [Op.ne]: null } },
                    include: [
                        { 
                            model: PeriodeJabatan, 
                            as: 'periodeJabatan', 
                            include: [{ model: Pimpinan, as: 'pimpinan' }] 
                        }
                    ]
                });

                for (const ap of confirmedAP) {
                    const pimpinan = ap.periodeJabatan?.pimpinan;
                    if (pimpinan && pimpinan.is_calendar_synced) {
                        // Resync with updated agenda data
                        await googleCalendarHelper.syncEvent(pimpinan, agenda, ap.google_event_id);
                    }
                }
            } catch (syncError) {
                console.error('Agenda Update Sync Failed:', syncError);
            }

            // Create new status record: back to pending after revision edit
            // Only role pemohon triggers this
            if (req.user.nama_role !== 'Sespri') {
                const id_status_agenda = await this.generateStatusAgendaId(transaction);
                await StatusAgenda.create({
                    id_status_agenda,
                    id_agenda,
                    id_user_sespri: req.user.id_user,
                    status_agenda: 'pending',
                    tanggal_status: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ')[0],
                    catatan: 'Permohonan telah direvisi oleh pemohon'
                }, { transaction });

                // Touch Agenda record for activity-based sorting
                await agenda.update({ updatedAt: new Date() }, { transaction });
            }

            await transaction.commit();

            // Reload agenda with all includes to ensure frontend gets updated associations (like KASKPD)
            const updatedAgenda = await Agenda.findByPk(id_agenda, {
                include: [
                    {
                        model: StatusAgenda,
                        as: 'statusAgendas',
                        order: [['createdAt', 'DESC']]
                    },
                    {
                        model: User,
                        as: 'pemohon',
                        attributes: ['nama', 'instansi']
                    },
                    {
                        model: AgendaPimpinan,
                        as: 'agendaPimpinans',
                        include: [
                            {
                                model: PeriodeJabatan,
                                as: 'periodeJabatan',
                                include: [
                                    { model: JabatanPimpinan, as: 'jabatan' },
                                    { model: Pimpinan, as: 'pimpinan', attributes: ['nama_pimpinan'] }
                                ]
                            }
                        ]
                    },
                    {
                        model: KASKPDPendamping,
                        as: 'kaskpdPendampings',
                        include: [{
                            model: KASKPD,
                            as: 'kaskpd',
                            attributes: ['id_ka_skpd', 'nama_instansi']
                        }]
                    }
                ]
            });

            return this.sendResponse(res, 200, true, 'Agenda berhasil diperbarui', updatedAgenda);
        } catch (error) {
            await transaction.rollback();
            return this.sendError(res, error, 'Gagal memperbarui agenda');
        }
    }

    async getLeaderAgendas(req, res) {
        try {
            const { start_date, end_date, id_jabatan, id_periode } = req.query;
            
            const whereClause = {};
            if (start_date && end_date) {
                whereClause.tanggal_kegiatan = {
                    [Op.between]: [start_date, end_date]
                };
            } else if (start_date) {
                whereClause.tanggal_kegiatan = {
                    [Op.gte]: start_date
                };
            }

            const { nama_role, id_user } = req.user;
            const agendaWhere = { ...whereClause };
            let pimpinanFilter = null;

            // If Ajudan, restrict to their assigned leaders
            if (nama_role === 'Ajudan') {
                const { PimpinanAjudan } = require('../models');
                const assignments = await PimpinanAjudan.findAll({
                    where: { 
                        id_user_ajudan: id_user,
                        status_aktif: 'aktif'
                    },
                    attributes: ['id_jabatan', 'id_periode']
                });

                if (assignments.length > 0) {
                    if (id_jabatan) {
                        const authorized = assignments.find(a => a.id_jabatan === id_jabatan);
                        if (!authorized) {
                            return this.sendResponse(res, 403, false, 'Anda tidak memiliki akses monitoring untuk pimpinan ini', []);
                        }
                        pimpinanFilter = [{ id_jabatan, id_periode: authorized.id_periode }];
                    } else {
                        pimpinanFilter = assignments.map(a => ({ id_jabatan: a.id_jabatan, id_periode: a.id_periode }));
                    }
                } else {
                    return this.sendResponse(res, 200, true, 'Data agenda pimpinan berhasil diambil (kosong)', []);
                }
            } else {
                if (id_jabatan) pimpinanFilter = [{ id_jabatan, id_periode }];
            }

            if (pimpinanFilter) {
                agendaWhere[Op.or] = [
                    {
                        '$agendaPimpinans.id_jabatan$': { [Op.in]: pimpinanFilter.map(p => p.id_jabatan) },
                        '$agendaPimpinans.id_periode$': { [Op.in]: pimpinanFilter.map(p => p.id_periode) }
                    },
                    {
                        '$slotAgendaPimpinans.id_jabatan_hadir$': { [Op.in]: pimpinanFilter.map(p => p.id_jabatan) },
                        '$slotAgendaPimpinans.id_periode_hadir$': { [Op.in]: pimpinanFilter.map(p => p.id_periode) }
                    }
                ];
            }

            const agendas = await Agenda.findAll({
                where: agendaWhere,
                include: [
                    {
                        model: StatusAgenda,
                        as: 'statusAgendas',
                        order: [['createdAt', 'DESC']],
                        limit: 1
                    },
                    {
                        model: User,
                        as: 'pemohon',
                        attributes: ['nama', 'instansi']
                    },
                    {
                        model: AgendaPimpinan,
                        as: 'agendaPimpinans',
                        required: false,
                        include: [
                            {
                                model: PeriodeJabatan,
                                as: 'periodeJabatan',
                                on: {
                                    id_jabatan: { [Op.col]: 'agendaPimpinans.id_jabatan' },
                                    id_periode: { [Op.col]: 'agendaPimpinans.id_periode' }
                                },
                                include: [
                                    { model: JabatanPimpinan, as: 'jabatan' },
                                    { model: Pimpinan, as: 'pimpinan', attributes: ['nama_pimpinan'] }
                                ]
                            }
                        ]
                    },
                    {
                        model: SlotAgendaPimpinan,
                        as: 'slotAgendaPimpinans',
                        required: false,
                        include: [
                            { model: SlotWaktu, as: 'slotWaktu' },
                            {
                                model: PeriodeJabatan,
                                as: 'periodeJabatanDiusulkan',
                                on: {
                                    id_jabatan: { [Op.col]: 'slotAgendaPimpinans.id_jabatan_diusulkan' },
                                    id_periode: { [Op.col]: 'slotAgendaPimpinans.id_periode_diusulkan' }
                                },
                                include: [
                                    { model: JabatanPimpinan, as: 'jabatan' },
                                    { model: Pimpinan, as: 'pimpinan', attributes: ['nama_pimpinan'] }
                                ]
                            },
                            {
                                model: PeriodeJabatan,
                                as: 'periodeJabatanHadir',
                                on: {
                                    id_jabatan: { [Op.col]: 'slotAgendaPimpinans.id_jabatan_hadir' },
                                    id_periode: { [Op.col]: 'slotAgendaPimpinans.id_periode_hadir' }
                                },
                                include: [
                                    { model: JabatanPimpinan, as: 'jabatan' },
                                    { model: Pimpinan, as: 'pimpinan', attributes: ['nama_pimpinan'] }
                                ]
                            }
                        ]
                    },
                    {
                        model: Penugasan,
                        as: 'penugasans',
                        include: [{
                            model: LaporanKegiatan,
                            as: 'laporanKegiatans',
                            attributes: ['id_laporan', 'deskripsi_laporan', 'catatan_laporan', 'dokumentasi_laporan', 'createdAt']
                        }]
                    },
                    {
                        model: KASKPDPendamping,
                        as: 'kaskpdPendampings',
                        include: [{
                            model: KASKPD,
                            as: 'kaskpd',
                            attributes: ['id_ka_skpd', 'nama_instansi']
                        }]
                    }
                ],
                order: [['updatedAt', 'DESC']]
            });

            return this.sendResponse(res, 200, true, 'Data agenda pimpinan berhasil diambil', agendas);
        } catch (error) {
            return this.sendError(res, error, 'Gagal mengambil data agenda pimpinan');
        }
    }

    async updateLeaderAttendance(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const { id_agenda, id_jabatan, id_periode } = req.params;
            const { nama_role, id_user } = req.user;

            // Security Check: If Ajudan, verify they are assigned to this leader
            if (nama_role === 'Ajudan') {
                const assignment = await PimpinanAjudan.findOne({
                    where: { 
                        id_user_ajudan: id_user, 
                        id_jabatan, 
                        id_periode,
                        status_aktif: 'aktif'
                    },
                    transaction
                });
                if (!assignment) {
                    await transaction.rollback();
                    return this.sendResponse(res, 403, false, 'Anda tidak memiliki akses untuk mengelola agenda pimpinan ini');
                }
            }

            const { status_kehadiran, id_jabatan_perwakilan, id_periode_perwakilan, nama_perwakilan, keterangan } = req.body;

            const agendaPimpinan = await AgendaPimpinan.findOne({
                where: { id_agenda, id_jabatan, id_periode },
                include: [{ model: Agenda, as: 'agenda' }],
                transaction
            });

            if (!agendaPimpinan) {
                await transaction.rollback();
                return this.sendResponse(res, 404, false, 'Data agenda pimpinan tidak ditemukan');
            }

            const agenda = agendaPimpinan.agenda;

            // Check if agenda has passed
            const now = new Date();
            const agendaEnd = new Date(`${agenda.tanggal_kegiatan}T${agenda.waktu_selesai}+07:00`);
            if (agendaEnd < now) {
                await transaction.rollback();
                return this.sendResponse(res, 400, false, 'Agenda sudah selesai/lewat, tidak dapat mengubah status kehadiran.');
            }


            let finalNamaPerwakilan = nama_perwakilan;
            let finalJabatanPerwakilan = '-';
            let originalPimpinanObj = null;

            // Fetch original Pimpinan details
            const origPimpinan = await PeriodeJabatan.findOne({
                where: { id_jabatan, id_periode },
                include: [{ model: Pimpinan, as: 'pimpinan' }, { model: JabatanPimpinan, as: 'jabatan' }],
                transaction
            });
            if (origPimpinan && origPimpinan.pimpinan) {
               originalPimpinanObj = origPimpinan;
            }

            // If represented by another leader in the system, fetch their name
            if (status_kehadiran === 'diwakilkan' && id_jabatan_perwakilan) {
                const repPimpinan = await PeriodeJabatan.findOne({
                    where: { id_jabatan: id_jabatan_perwakilan, id_periode: id_periode_perwakilan },
                    include: [{ model: Pimpinan, as: 'pimpinan' }],
                    transaction
                });
                if (repPimpinan && repPimpinan.pimpinan) {
                    finalNamaPerwakilan = repPimpinan.pimpinan.nama_pimpinan;

                    // VALIDATION: Check if the representative is already invited to this agenda
                    const alreadyInvited = await AgendaPimpinan.findOne({
                        where: {
                            id_agenda,
                            id_jabatan: id_jabatan_perwakilan,
                            id_periode: id_periode_perwakilan
                        },
                        transaction
                    });

                    if (alreadyInvited) {
                        await transaction.rollback();
                        return this.sendResponse(res, 400, false, `${finalNamaPerwakilan} sudah masuk dalam daftar undangan agenda ini, sehingga tidak dapat ditunjuk sebagai perwakilan.`);
                    }
                }
            }

            // 1. Update AgendaPimpinan
            await agendaPimpinan.update({
                status_kehadiran,
                nama_perwakilan: status_kehadiran === 'diwakilkan' ? finalNamaPerwakilan : null,
                keterangan
            }, { transaction });

            // 2. Manage SlotAgendaPimpinan
            // Remove existing slots for this agenda and THIS SPECIFIC proposed leader
            await SlotAgendaPimpinan.destroy({
                where: {
                    id_agenda,
                    id_jabatan_diusulkan: id_jabatan,
                    id_periode_diusulkan: id_periode
                },
                transaction
            });

            // If hadir or diwakilkan by another leader, create new slot records
            if (status_kehadiran === 'hadir' || (status_kehadiran === 'diwakilkan' && id_jabatan_perwakilan)) {
                const actualJabatan = status_kehadiran === 'hadir' ? id_jabatan : id_jabatan_perwakilan;
                const actualPeriode = status_kehadiran === 'hadir' ? id_periode : id_periode_perwakilan;

                // Overlap condition: slot overlaps agenda if slot_start < agenda_end AND slot_end > agenda_start
                const slots = await SlotWaktu.findAll({
                    where: {
                        slot_waktu_mulai: { [Op.lt]: agendaPimpinan.agenda.waktu_selesai },
                        slot_waktu_selesai: { [Op.gt]: agendaPimpinan.agenda.waktu_mulai }
                    },
                    order: [['slot_waktu_mulai', 'ASC']],
                    transaction
                });
 
                // === CONFLICT CHECK: Check if the actual attending pimpinan already has slots on the same date & overlapping time for a DIFFERENT agenda ===
                if (slots.length > 0) {
                    const conflictingSlots = await SlotAgendaPimpinan.findAll({
                        where: {
                            tanggal: agendaPimpinan.agenda.tanggal_kegiatan,
                            id_slot_waktu: { [Op.in]: slots.map(s => s.id_slot_waktu) },
                            id_jabatan_hadir: actualJabatan,
                            id_periode_hadir: actualPeriode,
                            id_agenda: { [Op.ne]: id_agenda }, // Different agenda
                            kehadiran: 'hadir'
                        },
                        include: [{
                            model: Agenda,
                            as: 'agenda',
                            attributes: ['id_agenda', 'nama_kegiatan', 'waktu_mulai', 'waktu_selesai']
                        }],
                        transaction
                    });

                    if (conflictingSlots.length > 0) {
                        // Get the conflicting pimpinan name
                        const conflictingPimpinan = await PeriodeJabatan.findOne({
                            where: { id_jabatan: actualJabatan, id_periode: actualPeriode },
                            include: [
                                { model: Pimpinan, as: 'pimpinan', attributes: ['nama_pimpinan'] },
                                { model: JabatanPimpinan, as: 'jabatan', attributes: ['nama_jabatan'] }
                            ],
                            transaction
                        });

                        const pimpinanName = conflictingPimpinan?.pimpinan?.nama_pimpinan || 'Pimpinan';
                        const jabatanName = conflictingPimpinan?.jabatan?.nama_jabatan || '';
                        
                        // Collect unique conflicting agenda names
                        const conflictingAgendaNames = [...new Set(conflictingSlots
                            .map(cs => cs.agenda?.nama_kegiatan)
                            .filter(Boolean)
                        )];

                        const conflictingAgendaTimes = [...new Set(conflictingSlots
                            .map(cs => cs.agenda ? `${cs.agenda.waktu_mulai?.slice(0,5)}-${cs.agenda.waktu_selesai?.slice(0,5)}` : null)
                            .filter(Boolean)
                        )];

                        await transaction.rollback();
                        return this.sendResponse(res, 409, false, 
                            `Jadwal bentrok! ${pimpinanName}${jabatanName ? ' (' + jabatanName + ')' : ''} sudah memiliki agenda "${conflictingAgendaNames.join(', ')}" (${conflictingAgendaTimes.join(', ')}) pada tanggal yang sama dan waktu yang bersinggungan.`
                        );
                    }
                }
                // === END CONFLICT CHECK ===

                for (const slot of slots) {
                    const existingSlot = await SlotAgendaPimpinan.findOne({
                        where: {
                            tanggal: agendaPimpinan.agenda.tanggal_kegiatan,
                            id_slot_waktu: slot.id_slot_waktu,
                            id_jabatan_diusulkan: id_jabatan,
                            id_periode_diusulkan: id_periode,
                            id_agenda: id_agenda
                        },
                        transaction
                    });

                    if (!existingSlot) {
                        await SlotAgendaPimpinan.create({
                            tanggal: agendaPimpinan.agenda.tanggal_kegiatan,
                            id_slot_waktu: slot.id_slot_waktu,
                            id_jabatan_hadir: actualJabatan,
                            id_periode_hadir: actualPeriode,
                            id_agenda: id_agenda,
                            id_jabatan_diusulkan: id_jabatan,
                            id_periode_diusulkan: id_periode,
                            kehadiran: 'hadir'
                        }, { transaction });
                    } else {
                        await existingSlot.update({
                            id_jabatan_hadir: actualJabatan,
                            id_periode_hadir: actualPeriode,
                            kehadiran: 'hadir'
                        }, { transaction });
                    }
                }
            }

            // === STAFF CLEANUP: If no more leaders are attending this agenda, remove staff assignments ===
            const remainingPimpinanSlotsCount = await SlotAgendaPimpinan.count({
                where: { id_agenda },
                transaction
            });

            if (remainingPimpinanSlotsCount === 0) {
                const penugasans = await Penugasan.findAll({
                    where: { id_agenda },
                    transaction
                });

                if (penugasans.length > 0) {
                    const penugasanIds = penugasans.map(p => p.id_penugasan);
                    
                    // Delete staff slots
                    await SlotAgendaStaff.destroy({
                        where: { id_penugasan: { [Op.in]: penugasanIds } },
                        transaction
                    });

                    // Delete penugasan
                    await Penugasan.destroy({
                        where: { id_agenda },
                        transaction
                    });
                }
            }
            // === END STAFF CLEANUP ===

            // 3. Auto-update StatusAgenda
            let newOverallStatus = null;
            if (status_kehadiran === 'hadir') newOverallStatus = 'approved_ajudan';
            else if (status_kehadiran === 'diwakilkan') newOverallStatus = 'delegated';
            else if (status_kehadiran === 'tidak_hadir') newOverallStatus = 'rejected_ajudan';

            if (newOverallStatus) {
                const id_status_agenda = await this.generateStatusAgendaId(transaction);
                const pimpinanLabel = originalPimpinanObj?.jabatan?.nama_jabatan || originalPimpinanObj?.pimpinan?.nama_pimpinan || 'Pimpinan';
                
                await StatusAgenda.create({
                    id_status_agenda,
                    id_agenda,
                    id_user_sespri: req.user.id_user,
                    status_agenda: newOverallStatus,
                    tanggal_status: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ')[0],
                    catatan: `[${pimpinanLabel}] - Status diperbarui oleh ${req.user.nama_role} via kehadiran: ${status_kehadiran}`
                }, { transaction });

                // Touch Agenda record to update its updatedAt timestamp for activity-based sorting
                await Agenda.update({ updatedAt: new Date() }, { where: { id_agenda }, transaction });
            }

            await transaction.commit();

            // 4. Notify Kasubag and Sespri (Post-Commit)
            if (status_kehadiran === 'hadir' || status_kehadiran === 'diwakilkan') {
                try {
                    const { Role } = require('../models');
                    const recipients = await User.findAll({
                        include: [{
                            model: Role,
                            as: 'role',
                            where: {
                                nama_role: ['Sespri', 'Kasubag Media', 'Kasubag Protokol']
                            }
                        }]
                    });

                    const labelKehadiran = status_kehadiran === 'hadir' ? 'Hadir' : 'Diwakilkan';
                    const pimpinanName = originalPimpinanObj?.pimpinan?.nama_pimpinan || 'Pimpinan';
                    
                    for (const recipient of recipients) {
                        const role = recipient.role.nama_role;
                        const isKasubag = role.startsWith('Kasubag');
                        
                        let targetUrl = '/sespri/agenda-pimpinan';
                        if (role === 'Kasubag Media') targetUrl = '/kasubag-media/assign-staff';
                        else if (role === 'Kasubag Protokol') targetUrl = '/kasubag-protokol/assign-staff';

                        const notificationPayload = {
                            title: 'Konfirmasi Kehadiran Pimpinan',
                            body: `${pimpinanName} dikonfirmasi "${labelKehadiran}" untuk kegiatan: ${agenda.nama_kegiatan}.${isKasubag ? ' Silakan berikan penugasan.' : ''}`,
                            data: {
                                url: targetUrl,
                                id_agenda: id_agenda,
                                status: newOverallStatus
                            }
                        };
                        await sendPushNotification(recipient.id_user, notificationPayload);
                    }
                } catch (notifError) {
                    console.error('Error sending confirmation notifications to Kasubag/Sespri:', notifError);
                }
            }

            // === START GOOGLE CALENDAR SYNC ===
            try {
                // 1. Identify previous state to handle cleanup
                
                // Fetch the pimpinan who is supposed to have the agenda NOW
                let pimpinanToSync = null;
                if (status_kehadiran === 'hadir') {
                    pimpinanToSync = await Pimpinan.findByPk(originalPimpinanObj.id_pimpinan);
                } else if (status_kehadiran === 'diwakilkan' && id_jabatan_perwakilan) {
                    const repPeriode = await PeriodeJabatan.findOne({
                        where: { id_jabatan: id_jabatan_perwakilan, id_periode: id_periode_perwakilan },
                        attributes: ['id_pimpinan']
                    });
                    if (repPeriode) {
                        pimpinanToSync = await Pimpinan.findByPk(repPeriode.id_pimpinan);
                    }
                }

                // 2. Handle Cleanup: If there was an old event, we should try to delete it 
                // To be safe, if google_event_id exists, we try to delete it from the original pimpinan 
                // AND the current pimpinanToSync (if it's a different one) to avoid duplicates/stale events.
                if (agendaPimpinan.google_event_id) {
                    const originalPimpinan = await Pimpinan.findByPk(originalPimpinanObj.id_pimpinan);
                    if (originalPimpinan && originalPimpinan.is_calendar_synced) {
                        await googleCalendarHelper.deleteEvent(originalPimpinan, agendaPimpinan.google_event_id);
                    }

                    // If it was potentially on a representative's calendar before, we don't strictly know which one 
                    // without a schema change. But usually, it's either the original or the NEW pimpinanToSync.
                    if (pimpinanToSync && pimpinanToSync.id_pimpinan !== originalPimpinanObj.id_pimpinan && pimpinanToSync.is_calendar_synced) {
                        await googleCalendarHelper.deleteEvent(pimpinanToSync, agendaPimpinan.google_event_id);
                    }
                }

                // 3. Create New Event
                if (pimpinanToSync && pimpinanToSync.is_calendar_synced && (status_kehadiran === 'hadir' || status_kehadiran === 'diwakilkan')) {
                    const newEventId = await googleCalendarHelper.syncEvent(pimpinanToSync, agendaPimpinan.agenda);
                    await agendaPimpinan.update({ google_event_id: newEventId });
                } else {
                    // If status is not attending or no sync, clear the event ID
                    if (agendaPimpinan.google_event_id) {
                        await agendaPimpinan.update({ google_event_id: null });
                    }
                }
            } catch (syncError) {
                console.error('SIMAP Google Calendar Sync Error:', syncError);
            }
            // === END GOOGLE CALENDAR SYNC ===

            return this.sendResponse(res, 200, true, 'Status kehadiran berhasil diperbarui', agendaPimpinan);
        } catch (error) {
            if (transaction) await transaction.rollback();
            return this.sendError(res, error, 'Gagal memperbarui status kehadiran');
        }
    }

    async cancelAgenda(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const { id_agenda } = req.params;
            const id_user_pemohon = req.user.id_user;

            const agenda = await Agenda.findByPk(id_agenda, {
                include: [{
                    model: StatusAgenda,
                    as: 'statusAgendas',
                    order: [['createdAt', 'DESC']],
                    limit: 1
                }],
                transaction
            });

            if (!agenda) {
                await transaction.rollback();
                return this.sendResponse(res, 404, false, 'Agenda tidak ditemukan');
            }

            if (agenda.id_user_pemohon !== id_user_pemohon) {
                await transaction.rollback();
                return this.sendResponse(res, 403, false, 'Anda tidak memiliki akses untuk membatalkan agenda ini');
            }

            const latestStatus = agenda.statusAgendas?.[0]?.status_agenda;
            if (!['pending', 'revision'].includes(latestStatus)) {
                await transaction.rollback();
                return this.sendResponse(res, 400, false, 'Agenda hanya bisa dibatalkan jika status masih pending atau revisi');
            }

            const id_status_agenda = await this.generateStatusAgendaId(transaction);
            await StatusAgenda.create({
                id_status_agenda,
                id_agenda,
                id_user_sespri: req.user.id_user,
                status_agenda: 'canceled',
                tanggal_status: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ')[0],
                catatan: 'Dibatalkan oleh pemohon'
            }, { transaction });

            // Touch Agenda record
            await agenda.update({ updatedAt: new Date() }, { transaction });

            // Handle Google Calendar Deletion if agenda is canceled
            try {
                const agendaPimpinans = await AgendaPimpinan.findAll({
                    where: { id_agenda, google_event_id: { [Op.ne]: null } },
                    include: [
                        { 
                            model: PeriodeJabatan, 
                            as: 'periodeJabatan', 
                            include: [{ model: Pimpinan, as: 'pimpinan' }] 
                        }
                    ],
                    transaction
                });

                for (const ap of agendaPimpinans) {
                    const pimpinan = ap.periodeJabatan?.pimpinan;
                    if (pimpinan && pimpinan.is_calendar_synced) {
                        await googleCalendarHelper.deleteEvent(pimpinan, ap.google_event_id);
                        await ap.update({ google_event_id: null }, { transaction });
                    }
                }
            } catch (syncError) {
                console.error('Agenda Cancellation Sync Failed:', syncError);
            }

            await transaction.commit();

            return this.sendResponse(res, 201, true, 'Agenda berhasil dibatalkan', { id_agenda, status: 'canceled' });
        } catch (error) {
            await transaction.rollback();
            return this.sendError(res, error, 'Gagal membatalkan agenda');
        }
    }

    async updateAgendaSlots(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const { id_agenda, slots } = req.body; // slots: Array of { tanggal, id_slot_waktu, id_jabatan_hadir, id_periode_hadir, kehadiran }

            // 1. Clear existing slots for this agenda
            await SlotAgendaPimpinan.destroy({
                where: { id_agenda },
                transaction
            });

            // 2. Insert new slots
            if (slots && Array.isArray(slots)) {
                await SlotAgendaPimpinan.bulkCreate(slots.map(s => ({
                    ...s,
                    id_agenda
                })), { transaction });
            }

            await transaction.commit();
            return this.sendResponse(res, 200, true, 'Slot agenda pimpinan berhasil diperbarui');
        } catch (error) {
            await transaction.rollback();
            return this.sendError(res, error, 'Gagal memperbarui slot agenda pimpinan');
        }
    }
}

module.exports = new AgendaController();
