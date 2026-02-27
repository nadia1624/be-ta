const { Op } = require('sequelize');
const BaseController = require('./BaseController');
const { Penugasan, SlotAgendaStaff, SlotAgendaPimpinan, User, Role, Agenda, SlotWaktu, PeriodeJabatan, Pimpinan, Periode, sequelize } = require('../models');

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
            // Get unique agendas that have at least one 'hadir' slot 
            // AND have not been assigned yet for 'protokol' type
            const agendas = await Agenda.findAll({
                where: {
                    id_agenda: {
                        [Op.notIn]: sequelize.literal(`(
                            SELECT DISTINCT sap."id_agenda" 
                            FROM "SlotAgendaStaffs" sas
                            JOIN "Penugasans" p ON sas."id_penugasan" = p."id_penugasan"
                            JOIN "SlotAgendaPimpinans" sap ON 
                                sas."tanggal" = sap."tanggal" AND 
                                sas."id_slot_waktu" = sap."id_slot_waktu" AND 
                                sas."id_jabatan_hadir" = sap."id_jabatan_hadir" AND 
                                sas."id_periode_hadir" = sap."id_periode_hadir"
                            WHERE p."jenis_penugasan" = 'protokol'
                        )`)
                    }
                },
                include: [
                    {
                        model: SlotAgendaPimpinan,
                        as: 'slotAgendaPimpinans',
                        required: true, // INNER JOIN to ensure at least one slot exists
                        where: { kehadiran: 'hadir' }, // This usually represents confirmed presence (pimpinan or rep)
                        include: [
                            {
                                model: SlotWaktu,
                                as: 'slotWaktu'
                            },
                            {
                                model: PeriodeJabatan,
                                as: 'periodeJabatanHadir',
                                include: [
                                    { model: Pimpinan, as: 'pimpinan' },
                                    { model: Periode, as: 'periode' }
                                ]
                            }
                        ]
                    }
                ],
                order: [['tanggal_kegiatan', 'DESC']]
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

            // Find all 'hadir' slots for this agenda
            const slots = await SlotAgendaPimpinan.findAll({
                where: { 
                    id_agenda,
                    kehadiran: 'hadir'
                },
                transaction
            });

            if (slots.length === 0) {
                await transaction.rollback();
                return this.sendResponse(res, 404, false, 'Tidak ada slot agenda yang tersedia untuk penugasan (pimpinan tidak hadir)');
            }

            const id_penugasan = await this.generatePenugasanId();
            const id_user_kasubag = req.user.id_user;

            // Create Penugasan record
            const penugasan = await Penugasan.create({
                id_penugasan,
                id_user_kasubag,
                jenis_penugasan: 'protokol',
                deskripsi_penugasan,
                tanggal_penugasan: new Date()
            }, { transaction });

            // Create SlotAgendaStaff records for ALL slots and ALL staff
            const staffAssignments = [];
            for (const slot of slots) {
                for (const id_user_staff of staff_ids) {
                    staffAssignments.push({
                        tanggal: slot.tanggal,
                        id_slot_waktu: slot.id_slot_waktu,
                        id_jabatan_hadir: slot.id_jabatan_hadir,
                        id_periode_hadir: slot.id_periode_hadir,
                        id_user_staff,
                        id_penugasan,
                        kehadiran: 'hadir'
                    });
                }
            }

            await SlotAgendaStaff.bulkCreate(staffAssignments, { transaction });

            await transaction.commit();
            return this.sendResponse(res, 201, true, 'Penugasan berhasil dibuat untuk seluruh slot agenda', penugasan);
        } catch (error) {
            await transaction.rollback();
            return this.sendError(res, error, 'Error creating assignment');
        }
    }
}

module.exports = new PenugasanController();
