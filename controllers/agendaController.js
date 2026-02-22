const BaseController = require('./BaseController');
const { Agenda, StatusAgenda, AgendaPimpinan, SlotAgendaPimpinan, PeriodeJabatan, JabatanPimpinan, Pimpinan, SlotWaktu, User, sequelize } = require('../models');
const { Op } = require('sequelize');

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
                nama_kegiatan, lokasi_kegiatan, contact_person, keterangan,
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

            const id_agenda = await this.generateAgendaId(transaction);
            const id_status_agenda = await this.generateStatusAgendaId(transaction);

            const surat_permohonan = req.file ? req.file.path : null;

            const newAgenda = await Agenda.create({
                id_agenda,
                id_user_pemohon,
                nomor_surat,
                tanggal_surat,
                perihal,
                surat_permohonan,
                tanggal_pengajuan: new Date(),
                tanggal_kegiatan,
                waktu_mulai,
                waktu_selesai,
                nama_kegiatan,
                lokasi_kegiatan,
                contact_person,
                keterangan
            }, { transaction });

            const isSespri = req.user.nama_role === 'Sespri';

            await StatusAgenda.create({
                id_status_agenda,
                id_agenda: newAgenda.id_agenda,
                id_user_sespri: req.user.id_user,
                status_agenda: isSespri ? 'approved_sespri' : 'pending',
                tanggal_status: new Date(),
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
                        limit: 1
                    },
                    {
                        model: AgendaPimpinan,
                        as: 'agendaPimpinans',
                        include: [
                            {
                                model: PeriodeJabatan,
                                as: 'periodeJabatan',
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
                    }
                ],
                order: [['createdAt', 'DESC']]
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
                    }
                ],
                order: [['createdAt', 'DESC']]
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
                tanggal_status: new Date(),
                catatan: catatan || null
            }, { transaction });

            await transaction.commit();
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

            if (agenda.id_user_pemohon !== id_user_pemohon) {
                await transaction.rollback();
                return this.sendResponse(res, 403, false, 'Anda tidak memiliki akses untuk mengedit agenda ini');
            }

            const latestStatus = agenda.statusAgendas?.[0]?.status_agenda;
            if (latestStatus !== 'revision') {
                await transaction.rollback();
                return this.sendResponse(res, 400, false, 'Agenda hanya bisa diedit jika status adalah revisi');
            }

            const {
                nomor_surat, tanggal_surat, perihal,
                nama_kegiatan, lokasi_kegiatan, contact_person, keterangan,
                tanggal_kegiatan, waktu_mulai, waktu_selesai
            } = req.body;

            const surat_permohonan = req.file ? req.file.path : undefined;

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

            // Create new status record: back to pending after revision edit
            const id_status_agenda = await this.generateStatusAgendaId(transaction);
            await StatusAgenda.create({
                id_status_agenda,
                id_agenda,
                id_user_sespri: req.user.id_user,
                status_agenda: 'pending',
                tanggal_status: new Date(),
                catatan: 'Permohonan telah direvisi oleh pemohon'
            }, { transaction });

            await transaction.commit();
            return this.sendResponse(res, 200, true, 'Agenda berhasil diperbarui', agenda);
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
            const pimpinanIncludeWhere = {};

            // If Ajudan, restrict to their assigned leaders
            if (nama_role === 'Ajudan') {
                const { PimpinanAjudan } = require('../models');
                const assignments = await PimpinanAjudan.findAll({
                    where: { id_user_ajudan: id_user },
                    attributes: ['id_jabatan', 'id_periode']
                });

                if (assignments.length > 0) {
                    if (id_jabatan) {
                        // Check if trying to filter by an authorized leader
                        const authorized = assignments.find(a => a.id_jabatan === id_jabatan);
                        if (!authorized) {
                            return this.sendResponse(res, 403, false, 'Anda tidak memiliki akses monitoring untuk pimpinan ini', []);
                        }
                        pimpinanIncludeWhere.id_jabatan = id_jabatan;
                        pimpinanIncludeWhere.id_periode = authorized.id_periode;
                    } else {
                        // Precise filtering using authorized pairs
                        pimpinanIncludeWhere[Op.or] = assignments.map(a => ({
                            id_jabatan: a.id_jabatan,
                            id_periode: a.id_periode
                        }));
                    }
                } else {
                    // No assignments, return empty list
                    return this.sendResponse(res, 200, true, 'Data agenda pimpinan berhasil diambil (kosong)', []);
                }
            } else {
                if (id_jabatan) pimpinanIncludeWhere.id_jabatan = id_jabatan;
                if (id_periode) pimpinanIncludeWhere.id_periode = id_periode;
            }

            const agendas = await Agenda.findAll({
                where: whereClause,
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
                        where: Object.keys(pimpinanIncludeWhere).length > 0 ? pimpinanIncludeWhere : undefined,
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
                        model: SlotAgendaPimpinan,
                        as: 'slotAgendaPimpinans',
                        include: [
                            { model: SlotWaktu, as: 'slotWaktu' }
                        ]
                    }
                ],
                order: [['tanggal_kegiatan', 'ASC'], ['waktu_mulai', 'ASC']]
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
                const { PimpinanAjudan } = require('../models');
                const assignment = await PimpinanAjudan.findOne({
                    where: { id_user_ajudan: id_user, id_jabatan, id_periode },
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
            const surat_disposisi = req.file ? req.file.path : agendaPimpinan.surat_disposisi;

            // Determine representative name if it's a pimpinan ID
            let finalNamaPerwakilan = nama_perwakilan;
            if (status_kehadiran === 'diwakilkan' && id_jabatan_perwakilan) {
                const rep = await PeriodeJabatan.findOne({
                    where: { id_jabatan: id_jabatan_perwakilan, id_periode: id_periode_perwakilan },
                    include: [{ model: Pimpinan, as: 'pimpinan' }],
                    transaction
                });
                if (rep && rep.pimpinan) {
                    finalNamaPerwakilan = rep.pimpinan.nama_pimpinan;
                }
            }

            // 1. Update AgendaPimpinan
            await agendaPimpinan.update({
                status_kehadiran,
                nama_perwakilan: status_kehadiran === 'diwakilkan' ? finalNamaPerwakilan : null,
                keterangan,
                surat_disposisi
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

                const slots = await SlotWaktu.findAll({
                    where: {
                        [Op.or]: [
                            {
                                slot_waktu_mulai: { [Op.lte]: agenda.waktu_mulai },
                                slot_waktu_selesai: { [Op.gt]: agenda.waktu_mulai }
                            },
                            {
                                slot_waktu_mulai: { [Op.lt]: agenda.waktu_selesai },
                                slot_waktu_selesai: { [Op.gte]: agenda.waktu_selesai }
                            },
                            {
                                slot_waktu_mulai: { [Op.gte]: agenda.waktu_mulai },
                                slot_waktu_selesai: { [Op.lte]: agenda.waktu_selesai }
                            }
                        ]
                    },
                    transaction
                });

                for (const slot of slots) {
                    const existingSlot = await SlotAgendaPimpinan.findOne({
                        where: {
                            tanggal: agenda.tanggal_kegiatan,
                            id_slot_waktu: slot.id_slot_waktu,
                            id_jabatan_diusulkan: id_jabatan,
                            id_periode_diusulkan: id_periode,
                            id_agenda: id_agenda
                        },
                        transaction
                    });

                    if (!existingSlot) {
                        await SlotAgendaPimpinan.create({
                            tanggal: agenda.tanggal_kegiatan,
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

            // 3. Auto-update StatusAgenda
            let newOverallStatus = null;
            if (status_kehadiran === 'hadir') newOverallStatus = 'approved_ajudan';
            else if (status_kehadiran === 'diwakilkan') newOverallStatus = 'delegated';
            else if (status_kehadiran === 'tidak_hadir') newOverallStatus = 'rejected_ajudan';

            if (newOverallStatus) {
                const id_status_agenda = await this.generateStatusAgendaId(transaction);
                await StatusAgenda.create({
                    id_status_agenda,
                    id_agenda,
                    id_user_sespri: req.user.id_user,
                    status_agenda: newOverallStatus,
                    tanggal_status: new Date(),
                    catatan: `Status diperbarui oleh Ajudan/Sespri via kehadiran: ${status_kehadiran}`
                }, { transaction });
            }

            await transaction.commit();
            return this.sendResponse(res, 200, true, 'Status kehadiran berhasil diperbarui', agendaPimpinan);
        } catch (error) {
            if (transaction) await transaction.rollback();
            return this.sendError(res, error, 'Gagal memperbarui status kehadiran');
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
