const { Op } = require('sequelize');
const BaseController = require('./BaseController');
const { Penugasan, SlotAgendaStaff, SlotAgendaPimpinan, AgendaPimpinan, User, Role, Agenda, StatusAgenda, SlotWaktu, PeriodeJabatan, Pimpinan, Periode, JabatanPimpinan, LaporanKegiatan, sequelize } = require('../models');

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

            // Overlap condition: slot overlaps agenda if slot_start < agenda_end AND slot_end > agenda_start
            const slots = await SlotWaktu.findAll({
                where: {
                    slot_waktu_mulai: { [Op.lt]: agenda.waktu_selesai },
                    slot_waktu_selesai: { [Op.gt]: agenda.waktu_mulai }
                },
                order: [['slot_waktu_mulai', 'ASC']],
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
                tanggal_penugasan: new Date(),
                status: 'pending'
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
    async getMyPenugasan(req, res) {
        try {
            const { id_user, nama_role } = req.user;
            const isStaff = nama_role === 'Staff Protokol' || nama_role === 'Staf Protokol';

            let whereClause = { jenis_penugasan: 'protokol' };
            if (isStaff) {
                // Find all penugasan IDs where this staff member is assigned
                const assignedPenugasans = await SlotAgendaStaff.findAll({
                    where: { id_user_staff: id_user },
                    attributes: ['id_penugasan'],
                    raw: true
                });
                const penugasanIds = assignedPenugasans.map(s => s.id_penugasan).filter(id => id);
                whereClause.id_penugasan = { [Op.in]: penugasanIds };
            } else {
                whereClause.id_user_kasubag = id_user;
            }

            const penugasanList = await Penugasan.findAll({
                where: whereClause,
                include: [
                    {
                        model: Agenda,
                        as: 'agenda',
                        attributes: ['id_agenda', 'nama_kegiatan', 'tanggal_kegiatan', 'waktu_mulai', 'waktu_selesai', 'lokasi_kegiatan'],
                        include: [
                            {
                                model: AgendaPimpinan,
                                as: 'agendaPimpinans',
                                where: { status_kehadiran: { [Op.in]: ['hadir', 'diwakilkan'] } },
                                required: false,
                                include: [
                                    {
                                        model: PeriodeJabatan,
                                        as: 'periodeJabatan',
                                        include: [
                                            { model: Pimpinan, as: 'pimpinan', attributes: ['nama_pimpinan'] },
                                            { model: JabatanPimpinan, as: 'jabatan', attributes: ['nama_jabatan'] }
                                        ],
                                    },
                                ]
                            }
                        ]
                    },
                    {
                        model: SlotAgendaStaff,
                        as: 'slotAgendaStaffs',
                        include: [
                            { model: User, as: 'staff', attributes: ['id_user', 'nama'] },
                            { model: SlotWaktu, as: 'slotWaktu', attributes: ['slot_waktu_mulai', 'slot_waktu_selesai'] }
                        ]
                    },
                    {
                        model: LaporanKegiatan,
                        as: 'laporanKegiatans',
                        include: [
                            { model: User, as: 'staff', attributes: ['id_user', 'nama'] }
                        ]
                    }
                ],
                order: [['tanggal_penugasan', 'DESC']]
            });

            // Compute status_pelaksanaan dynamically
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const result = penugasanList.map(p => {
                const plain = p.toJSON();

                // Map DB status → display status_pelaksanaan
                let status_pelaksanaan;
                if (plain.status === 'selesai') {
                    status_pelaksanaan = 'Selesai';
                } else if (plain.status === 'progress') {
                    status_pelaksanaan = 'Berlangsung';
                } else {
                    // null or 'pending'
                    status_pelaksanaan = 'Belum Dimulai';
                }

                // Collect unique staff names
                const staffMap = {};
                (plain.slotAgendaStaffs || []).forEach(s => {
                    if (s.staff) staffMap[s.staff.id_user] = s.staff.nama;
                });
                const nama_staf = Object.values(staffMap);

                // Support multiple pimpinans
                const pimpinans = (plain.agenda?.agendaPimpinans || []).map(ap => ({
                    nama_pimpinan: ap.periodeJabatan?.pimpinan?.nama_pimpinan || '-',
                    nama_jabatan: ap.periodeJabatan?.jabatan?.nama_jabatan || '-'
                }));

                return { ...plain, status_pelaksanaan, nama_staf, pimpinans };
            });

            return this.sendResponse(res, 200, true, 'Data penugasan berhasil diambil', result);
        } catch (error) {
            return this.sendError(res, error, 'Error fetching my penugasan');
        }
    }

    async getPenugasanDetail(req, res) {
        try {
            const { id } = req.params;
            const { id_user, nama_role } = req.user;
            const isStaff = nama_role === 'Staff Protokol' || nama_role === 'Staf Protokol';

            let whereClause = { id_penugasan: id };
            if (!isStaff) {
                whereClause.id_user_kasubag = id_user;
            }

            const penugasan = await Penugasan.findOne({
                where: { id_penugasan: id },
                include: [
                    {
                        model: Agenda,
                        as: 'agenda',
                        include: [
                            {
                                model: AgendaPimpinan,
                                as: 'agendaPimpinans',
                                where: { status_kehadiran: { [Op.in]: ['hadir', 'diwakilkan'] } },
                                required: false,
                                include: [
                                    {
                                        model: PeriodeJabatan,
                                        as: 'periodeJabatan',
                                        include: [
                                            { model: Pimpinan, as: 'pimpinan', attributes: ['nama_pimpinan'] },
                                            { model: JabatanPimpinan, as: 'jabatan', attributes: ['nama_jabatan'] }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        model: SlotAgendaStaff,
                        as: 'slotAgendaStaffs',
                        include: [
                            { model: User, as: 'staff', attributes: ['id_user', 'nama', 'email'] },
                            { model: SlotWaktu, as: 'slotWaktu', attributes: ['slot_waktu_mulai', 'slot_waktu_selesai'] }
                        ],
                        order: [['tanggal', 'ASC']]
                    },
                    {
                        model: LaporanKegiatan,
                        as: 'laporanKegiatans',
                        include: [
                            { model: User, as: 'staff', attributes: ['id_user', 'nama'] }
                        ],
                        order: [['createdAt', 'ASC']]
                    }
                ]
            });

            if (!penugasan) {
                return this.sendResponse(res, 404, false, 'Penugasan tidak ditemukan');
            }

            // Access control check
            if (!isStaff) {
                if (penugasan.id_user_kasubag !== id_user) {
                    return this.sendResponse(res, 403, false, 'Anda tidak memiliki akses ke penugasan ini');
                }
            } else {
                // Staff can only see it if they are assigned to at least one slot
                const isAssigned = penugasan.slotAgendaStaffs.some(s => String(s.id_user_staff) === String(id_user));
                if (!isAssigned) {
                    return this.sendResponse(res, 403, false, 'Anda tidak terdaftar dalam penugasan ini');
                }
            }

            const plain = penugasan.toJSON();

            // Map DB status → display status_pelaksanaan
            let status_pelaksanaan;
            if (plain.status === 'selesai') {
                status_pelaksanaan = 'Selesai';
            } else if (plain.status === 'progress') {
                status_pelaksanaan = 'Berlangsung';
            } else {
                // null or 'pending'
                status_pelaksanaan = 'Belum Dimulai';
            }

            // Collect unique staff
            const staffMap = {};
            (plain.slotAgendaStaffs || []).forEach(s => {
                if (s.staff) staffMap[s.staff.id_user] = s.staff;
            });
            const nama_staf = Object.values(staffMap).map(s => s.nama);

            // Support multiple pimpinans
            const pimpinans = (plain.agenda?.agendaPimpinans || []).map(ap => ({
                nama_pimpinan: ap.periodeJabatan?.pimpinan?.nama_pimpinan || '-',
                nama_jabatan: ap.periodeJabatan?.jabatan?.nama_jabatan || '-'
            }));

            return this.sendResponse(res, 200, true, 'Detail penugasan berhasil diambil', {
                ...plain,
                status_pelaksanaan,
                nama_staf,
                pimpinans
            });
        } catch (error) {
            return this.sendError(res, error, 'Error fetching penugasan detail');
        }
    }

    async updateStatusPenugasan(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const id_user_kasubag = req.user.id_user;

            const validStatuses = ['pending', 'progress', 'selesai'];
            if (!validStatuses.includes(status)) {
                return this.sendResponse(res, 400, false, `Status tidak valid. Pilihan: ${validStatuses.join(', ')}`);
            }

            const penugasan = await Penugasan.findOne({
                where: { id_penugasan: id, id_user_kasubag }
            });

            if (!penugasan) {
                return this.sendResponse(res, 404, false, 'Penugasan tidak ditemukan atau bukan milik Anda');
            }

            await penugasan.update({ status });

            const statusLabel = status === 'selesai' ? 'Selesai' : status === 'progress' ? 'Berlangsung' : 'Belum Dimulai';
            return this.sendResponse(res, 200, true, `Status penugasan berhasil diperbarui menjadi ${statusLabel}`, {
                id_penugasan: penugasan.id_penugasan,
                status
            });
        } catch (error) {
            return this.sendError(res, error, 'Error updating status penugasan');
        }
    }
}

module.exports = new PenugasanController();
