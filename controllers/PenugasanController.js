const { Op } = require('sequelize');
const BaseController = require('./BaseController');
const { Penugasan, SlotAgendaStaff, SlotAgendaPimpinan, AgendaPimpinan, User, Role, Agenda, StatusAgenda, SlotWaktu, PeriodeJabatan, Pimpinan, Periode, sequelize } = require('../models');

class PenugasanController extends BaseController {
    /**
     * Helper to generate Penugasan ID
     */
    async generatePenugasanId() {
        const lastPenugasan = await Penugasan.findOne({ 
            order: [['id_penugasan', 'DESC']],
            attributes: ['id_penugasan']
        });
        
        let nextNum = 1;
        if (lastPenugasan && lastPenugasan.id_penugasan.startsWith('PN')) {
            const num = parseInt(lastPenugasan.id_penugasan.substring(2));
            if (!isNaN(num)) nextNum = num + 1;
        }
        
        return `PN${nextNum.toString().padStart(3, '0')}`;
    }

    async getStaffProtokol(req, res) {
        try {
            const staffProtokol = await User.findAll({
                include: [
                    { 
                        model: Role, 
                        as: 'role',
                        where: { nama_role: 'Staff Protokol' }
                    }
                ],
                attributes: ['id_user', 'nama', 'email']
            });
            return this.sendResponse(res, 200, true, 'Data staff protokol berhasil diambil', staffProtokol);
        } catch (error) {
            return this.sendError(res, error, 'Error fetching staff protokol');
        }
    }

    async getAgendasForAssignment(req, res) {
        try {
            // Agenda eligible for assignment:
            // 1. At least one AgendaPimpinan has status_kehadiran = 'hadir' or 'diwakilkan'
            // 2. No Penugasan (protokol) exists yet for this agenda
            const agendas = await Agenda.findAll({
                where: {
                    id_agenda: {
                        // Must have at least one confirmed pimpinan (hadir or diwakilkan)
                        [Op.in]: sequelize.literal(`(
                            SELECT DISTINCT "id_agenda"
                            FROM "AgendaPimpinans"
                            WHERE "status_kehadiran" IN ('hadir', 'diwakilkan')
                        )`),
                        // Must NOT already have a protokol assignment
                        [Op.notIn]: sequelize.literal(`(
                            SELECT DISTINCT "id_agenda"
                            FROM "Penugasans"
                            WHERE "jenis_penugasan" = 'protokol'
                            AND "id_agenda" IS NOT NULL
                        )`)
                    }
                },
                include: [
                    {
                        model: AgendaPimpinan,
                        as: 'agendaPimpinans',
                        required: true,
                        where: { status_kehadiran: { [Op.in]: ['hadir', 'diwakilkan'] } },
                        include: [
                            {
                                model: PeriodeJabatan,
                                as: 'periodeJabatan',
                                include: [
                                    { model: Pimpinan, as: 'pimpinan' }
                                ]
                            }
                        ]
                    }
                ],
                order: [['tanggal_kegiatan', 'ASC']]
            });

            return this.sendResponse(res, 200, true, 'Data agenda untuk penugasan berhasil diambil', agendas);
        } catch (error) {
            return this.sendError(res, error, 'Error fetching agendas for assignment');
        }
    }

    async assignStaff(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const { 
                id_agenda, 
                staff_ids, // Array of user IDs
                deskripsi_penugasan 
            } = req.body;

            if (!id_agenda) {
                return this.sendResponse(res, 400, false, 'ID Agenda harus disertakan');
            }

            if (!staff_ids || !Array.isArray(staff_ids) || staff_ids.length === 0) {
                return this.sendResponse(res, 400, false, 'Staf harus dipilih');
            }

            // Verify agenda has at least one confirmed pimpinan (hadir or diwakilkan)
            const confirmedPimpinan = await AgendaPimpinan.findOne({
                where: {
                    id_agenda,
                    status_kehadiran: { [Op.in]: ['hadir', 'diwakilkan'] }
                },
                transaction
            });

            if (!confirmedPimpinan) {
                await transaction.rollback();
                return this.sendResponse(res, 404, false, 'Tidak ada pimpinan yang terkonfirmasi hadir atau diwakilkan untuk agenda ini');
            }

            // Get the agenda's date and time
            const agenda = await Agenda.findByPk(id_agenda, { transaction });
            if (!agenda) {
                await transaction.rollback();
                return this.sendResponse(res, 404, false, 'Agenda tidak ditemukan');
            }

            // Find all slot waktu that overlap with the agenda's time
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

            const id_penugasan = await this.generatePenugasanId();
            const id_user_kasubag = req.user.id_user;

            // Create Penugasan record with id_agenda
            const penugasan = await Penugasan.create({
                id_penugasan,
                id_agenda,
                id_user_kasubag,
                jenis_penugasan: 'protokol',
                deskripsi_penugasan,
                tanggal_penugasan: new Date()
            }, { transaction });

            // Create SlotAgendaStaff records for each overlapping slot and each staff
            if (slots.length > 0) {
                const staffAssignments = [];
                for (const slot of slots) {
                    for (const id_user_staff of staff_ids) {
                        staffAssignments.push({
                            tanggal: agenda.tanggal_kegiatan,
                            id_slot_waktu: slot.id_slot_waktu,
                            id_user_staff,
                            id_penugasan,
                            kehadiran: null
                        });
                    }
                }
                await SlotAgendaStaff.bulkCreate(staffAssignments, { transaction });
            }

            await transaction.commit();
            return this.sendResponse(res, 201, true, 'Penugasan berhasil dibuat', penugasan);
        } catch (error) {
            await transaction.rollback();
            return this.sendError(res, error, 'Error creating assignment');
        }
    }
}

module.exports = new PenugasanController();
