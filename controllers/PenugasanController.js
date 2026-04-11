const { Op } = require('sequelize');
const BaseController = require('./BaseController');
const { Penugasan, SlotAgendaStaff, SlotAgendaPimpinan, AgendaPimpinan, User, Role, Agenda, StatusAgenda, SlotWaktu, PeriodeJabatan, Pimpinan, Periode, JabatanPimpinan, LaporanKegiatan, DraftBerita, DokumentasiBerita, RevisiDraftBerita, sequelize } = require('../models');
const { sendPushNotification } = require('../helpers/pushNotificationHelper');

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
                        where: { nama_role: { [Op.in]: ['Staff Protokol', 'Staf Protokol'] } }
                    }
                ],
                attributes: ['id_user', 'nama', 'email']
            });
            return this.sendResponse(res, 200, true, 'Data staff protokol berhasil diambil', staffProtokol);
        } catch (error) {
            return this.sendError(res, error, 'Error fetching staff protokol');
        }
    }

    async getStaffMedia(req, res) {
        try {
            const staffMedia = await User.findAll({
                include: [
                    { 
                        model: Role, 
                        as: 'role',
                        where: { nama_role: { [Op.in]: ['Staff Media', 'Staf Media'] } }
                    }
                ],
                attributes: ['id_user', 'nama', 'email']
            });
            return this.sendResponse(res, 200, true, 'Data staff media berhasil diambil', staffMedia);
        } catch (error) {
            return this.sendError(res, error, 'Error fetching staff media');
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
                                on: {
                                    id_jabatan: { [Op.col]: 'agendaPimpinans.id_jabatan' },
                                    id_periode: { [Op.col]: 'agendaPimpinans.id_periode' }
                                },
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

    async getAgendasForMediaAssignment(req, res) {
        try {
            // Agenda eligible for assignment:
            // 1. At least one AgendaPimpinan has status_kehadiran = 'hadir' or 'diwakilkan'
            // 2. No Penugasan (media) exists yet for this agenda
            const agendas = await Agenda.findAll({
                where: {
                    id_agenda: {
                        // Must have at least one confirmed pimpinan (hadir or diwakilkan)
                        [Op.in]: sequelize.literal(`(
                            SELECT DISTINCT "id_agenda"
                            FROM "AgendaPimpinans"
                            WHERE "status_kehadiran" IN ('hadir', 'diwakilkan')
                        )`),
                        // Must NOT already have a media assignment
                        [Op.notIn]: sequelize.literal(`(
                            SELECT DISTINCT "id_agenda"
                            FROM "Penugasans"
                            WHERE "jenis_penugasan" = 'media'
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
                                on: {
                                    id_jabatan: { [Op.col]: 'agendaPimpinans.id_jabatan' },
                                    id_periode: { [Op.col]: 'agendaPimpinans.id_periode' }
                                },
                                include: [
                                    { model: Pimpinan, as: 'pimpinan' }
                                ]
                            }
                        ]
                    }
                ],
                order: [['tanggal_kegiatan', 'ASC']]
            });

            return this.sendResponse(res, 200, true, 'Data agenda untuk penugasan media berhasil diambil', agendas);
        } catch (error) {
            return this.sendError(res, error, 'Error fetching agendas for media assignment');
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

            const { id_user, nama_role } = req.user;
            const id_penugasan = await this.generatePenugasanId();
            const id_user_kasubag = id_user;
            
            // Determine jenis_penugasan based on role if not provided
            let jenis_penugasan = req.body.jenis_penugasan;
            if (!jenis_penugasan) {
                if (nama_role === 'Kasubag Media') jenis_penugasan = 'media';
                else if (nama_role === 'Kasubag Protokol') jenis_penugasan = 'protokol';
                else jenis_penugasan = 'protokol'; // Default
            }

            // Create Penugasan record with id_agenda
            const penugasan = await Penugasan.create({
                id_penugasan,
                id_agenda,
                id_user_kasubag,
                jenis_penugasan,
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

            // Notify each assigned staff member
            for (const id_user_staff of staff_ids) {
                const targetUrl = jenis_penugasan === 'media' 
                    ? `/staff-media/tugas-saya` 
                    : `/staff-protokol/tugas-saya`;

                await sendPushNotification(id_user_staff, {
                    title: 'Penugasan Baru',
                    body: `Anda telah diberikan penugasan baru oleh Kasubag untuk agenda: "${agenda.nama_kegiatan}". Silakan periksa detail tugas Anda.`,
                    data: {
                        url: targetUrl,
                        id_penugasan: penugasan.id_penugasan
                    }
                });
            }

            return this.sendResponse(res, 201, true, 'Penugasan berhasil dibuat', penugasan);
        } catch (error) {
            await transaction.rollback();
            return this.sendError(res, error, 'Error creating assignment');
        }
    }
    async getMyPenugasan(req, res) {
        try {
            const { id_user, nama_role } = req.user;
            const isMedia = nama_role === 'Kasubag Media' || nama_role === 'Staff Media' || nama_role === 'Staf Media';
            const isStaff = nama_role === 'Staff Protokol' || nama_role === 'Staf Protokol' || nama_role === 'Staff Media' || nama_role === 'Staf Media';

            let whereClause = { 
                jenis_penugasan: isMedia ? 'media' : 'protokol' 
            };
            
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
                                        on: {
                                            id_jabatan: { [Op.col]: 'agenda->agendaPimpinans.id_jabatan' },
                                            id_periode: { [Op.col]: 'agenda->agendaPimpinans.id_periode' }
                                        },
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
                    },
                    {
                        model: DraftBerita,
                        as: 'draftBeritas',
                        include: [
                            { model: DokumentasiBerita, as: 'dokumentasis' },
                            { model: RevisiDraftBerita, as: 'revisies' }
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
            const isMonitoringRole = ['Kasubag Media', 'Staff Media', 'Staf Media', 'Sespri', 'Admin'].includes(nama_role);
            const isStaffProtokol = nama_role === 'Staff Protokol' || nama_role === 'Staf Protokol';

            let whereClause = { id_penugasan: id };
            // Original logic restricted non-staff to their own created assignments.
            // We relax this for monitoring roles.
            if (!isStaffProtokol && !isMonitoringRole) {
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
                                        on: {
                                            id_jabatan: { [Op.col]: 'agenda->agendaPimpinans.id_jabatan' },
                                            id_periode: { [Op.col]: 'agenda->agendaPimpinans.id_periode' }
                                        },
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
                    },
                    {
                        model: DraftBerita,
                        as: 'draftBeritas',
                        include: [
                            { model: DokumentasiBerita, as: 'dokumentasis' },
                            { model: RevisiDraftBerita, as: 'revisies' }
                        ]
                    }
                ]
            });

            if (!penugasan) {
                return this.sendResponse(res, 404, false, 'Penugasan tidak ditemukan');
            }

            // Access control check
            if (isMonitoringRole) {
                // Monitoring roles can view protocol assignments
                if (penugasan.jenis_penugasan !== 'protokol' && penugasan.id_user_kasubag !== id_user) {
                    return this.sendResponse(res, 403, false, 'Anda tidak memiliki akses ke penugasan ini');
                }
            } else if (isStaffProtokol) {
                // Staff Protokol can only see it if they are assigned to at least one slot
                const isAssigned = penugasan.slotAgendaStaffs.some(s => String(s.id_user_staff) === String(id_user));
                if (!isAssigned) {
                    return this.sendResponse(res, 403, false, 'Anda tidak terdaftar dalam penugasan ini');
                }
            } else {
                // Other Kasubags (e.g. Kasubag Protokol) can only see what they created
                if (penugasan.id_user_kasubag !== id_user) {
                    return this.sendResponse(res, 403, false, 'Anda tidak memiliki akses ke penugasan ini');
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

    async getProtokolAssignments(req, res) {
        try {
            const penugasanList = await Penugasan.findAll({
                where: { jenis_penugasan: 'protokol' },
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
                                        on: {
                                            id_jabatan: { [Op.col]: 'agenda->agendaPimpinans.id_jabatan' },
                                            id_periode: { [Op.col]: 'agenda->agendaPimpinans.id_periode' }
                                        },
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

            const result = penugasanList.map(p => {
                const plain = p.toJSON();
                let status_pelaksanaan = plain.status === 'selesai' ? 'Selesai' : plain.status === 'progress' ? 'Berlangsung' : 'Belum Dimulai';
                
                const staffMap = {};
                (plain.slotAgendaStaffs || []).forEach(s => {
                    if (s.staff) staffMap[s.staff.id_user] = s.staff.nama;
                });
                const nama_staf = Object.values(staffMap);

                const pimpinans = (plain.agenda?.agendaPimpinans || []).map(ap => ({
                    nama_pimpinan: ap.periodeJabatan?.pimpinan?.nama_pimpinan || '-',
                    nama_jabatan: ap.periodeJabatan?.jabatan?.nama_jabatan || '-'
                }));

                return { ...plain, status_pelaksanaan, nama_staf, pimpinans };
            });

            return this.sendResponse(res, 200, true, 'Data penugasan protokol berhasil diambil', result);
        } catch (error) {
            return this.sendError(res, error, 'Error fetching protokol assignments');
        }
    }
}

module.exports = new PenugasanController();
