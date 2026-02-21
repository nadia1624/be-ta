const BaseController = require('./BaseController');
const { Agenda, StatusAgenda, AgendaPimpinan, SlotAgendaPimpinan, PeriodeJabatan, JabatanPimpinan, Pimpinan, SlotWaktu, sequelize } = require('../models');
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

    /**
     * Generate Lexicographical ID for StatusAgenda (SA001, SA002, ...)
     */
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

    /**
     * Create New Agenda Request with Pimpinan Invitations and Slots
     */
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

            if (!nomor_surat || !perihal || !nama_kegiatan || !waktu_mulai || !waktu_selesai || !tanggal_kegiatan) {
                await transaction.rollback();
                return this.sendResponse(res, 400, false, 'Nomor surat, perihal, nama kegiatan, dan waktu kegiatan wajib diisi');
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

            await StatusAgenda.create({
                id_status_agenda,
                id_agenda: newAgenda.id_agenda,
                status_agenda: 'pending',
                tanggal_status: new Date(),
                catatan: 'Permohonan baru diajukan'
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

    /**
     * Get All Available Time Slots
     */
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

    /**
     * Get Agendas for Current User (Pemohon)
     */
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
}

module.exports = new AgendaController();
