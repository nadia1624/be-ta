const BaseController = require('./BaseController');
const { User, Agenda, StatusAgenda, Penugasan, LaporanKegiatan, AgendaPimpinan, SlotAgendaPimpinan, SlotWaktu, PeriodeJabatan, JabatanPimpinan, Pimpinan, DraftBerita, SlotAgendaStaff, sequelize } = require('../models');
const { Op } = require('sequelize');

class DashboardController extends BaseController {
    async getAdminStats(req, res) {
        try {
            // 1. Total counts
            const totalUsers = await User.count();
            const totalAgenda = await Agenda.count();

            // 2. Pending Requests (latest status is 'pending')
            // Using a subquery approach for accurate latest status
            const pendingRequestsCount = await StatusAgenda.count({
                where: {
                    status_agenda: 'pending',
                    id_status_agenda: {
                        [Op.in]: sequelize.literal(`(
                            SELECT id_status_agenda 
                            FROM "StatusAgenda" AS sa2 
                            WHERE sa2.id_agenda = "StatusAgenda".id_agenda 
                            ORDER BY sa2."createdAt" DESC 
                            LIMIT 1
                        )`)
                    }
                }
            });

            // 3. Confirmed Agendas (latest status is 'approved_ajudan', 'delegated', or 'completed')
            const confirmedAgendasCount = await StatusAgenda.count({
                where: {
                    status_agenda: {
                        [Op.in]: ['approved_ajudan', 'delegated', 'completed']
                    },
                    id_status_agenda: {
                        [Op.in]: sequelize.literal(`(
                            SELECT id_status_agenda 
                            FROM "StatusAgenda" AS sa2 
                            WHERE sa2.id_agenda = "StatusAgenda".id_agenda 
                            ORDER BY sa2."createdAt" DESC 
                            LIMIT 1
                        )`)
                    }
                }
            });

            // 4. Recent Requests (limit 5)
            const recentRequests = await Agenda.findAll({
                limit: 5,
                order: [['updatedAt', 'DESC']],
                include: [
                    {
                        model: User,
                        as: 'pemohon',
                        attributes: ['nama']
                    },
                    {
                        model: StatusAgenda,
                        as: 'statusAgendas',
                        required: false,
                        separate: true,
                        limit: 1,
                        order: [['createdAt', 'DESC']]
                    }
                ]
            });

            // 5. Upcoming Agendas (limit 5)
            // Filter agendas with confirmed status that happen today or in the future
            const upcomingAgendaIds = await Agenda.findAll({
                attributes: ['id_agenda'],
                where: {
                    tanggal_kegiatan: {
                        [Op.gte]: new Date().toISOString().split('T')[0]
                    },
                    id_agenda: {
                        [Op.in]: sequelize.literal(`(
                            SELECT sa1.id_agenda
                            FROM "StatusAgenda" sa1
                            WHERE sa1.id_status_agenda = (
                                SELECT sa2.id_status_agenda
                                FROM "StatusAgenda" sa2
                                WHERE sa2.id_agenda = sa1.id_agenda
                                ORDER BY sa2."createdAt" DESC
                                LIMIT 1
                            )
                            AND sa1.status_agenda IN ('approved_ajudan', 'delegated', 'completed')
                        )`)
                    }
                },
                limit: 5,
                order: [['updatedAt', 'DESC']]
            });

            const upcomingAgenda = await Agenda.findAll({
                where: {
                    id_agenda: {
                        [Op.in]: upcomingAgendaIds.map(a => a.id_agenda)
                    }
                },
                order: [['updatedAt', 'DESC']],
                include: [
                    {
                        model: StatusAgenda,
                        as: 'statusAgendas',
                        required: true,
                        separate: true,
                        limit: 1,
                        order: [['createdAt', 'DESC']]
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
                                include: [
                                    { model: JabatanPimpinan, as: 'jabatan' },
                                    { model: Pimpinan, as: 'pimpinan', attributes: ['nama_pimpinan'] }
                                ]
                            }
                        ]
                    }
                ]
            });

            const dashboardData = {
                stats: {
                    totalUsers,
                    totalAgenda,
                    pendingRequests: pendingRequestsCount,
                    confirmedAgendas: confirmedAgendasCount
                },
                recentRequests: recentRequests.map(r => ({
                    nomor_surat: r.nomor_surat,
                    pemohon: r.pemohon?.nama || 'Unknown',
                    perihal: r.perihal,
                    tanggal_surat: r.tanggal_surat,
                    status: r.statusAgendas?.[0]?.status_agenda || 'pending'
                })),
                upcomingAgenda: upcomingAgenda.map(a => ({
                    nama_kegiatan: a.nama_kegiatan,
                    tanggal_kegiatan: a.tanggal_kegiatan,
                    waktu_mulai: a.waktu_mulai,
                    lokasi_kegiatan: a.lokasi_kegiatan,
                    nama_pimpinan: a.agendaPimpinans?.map(ap => ap.periodeJabatan?.pimpinan?.nama_pimpinan).join(', ') || '-',
                    status: a.statusAgendas?.[0]?.status_agenda === 'approved_ajudan' ? 'Terkonfirmasi' : 
                            a.statusAgendas?.[0]?.status_agenda === 'delegated' ? 'Diwakilkan' : 'Selesai'
                }))
            };

            return this.sendResponse(res, 200, true, 'Data dashboard admin berhasil diambil', dashboardData);
        } catch (error) {
            return this.sendError(res, error, 'Gagal mengambil data dashboard admin');
        }
    }

    async getSespriStats(req, res) {
        try {
            const today = new Date().toISOString().split('T')[0];

            // 1. Stats Cards data
            const pendingVerification = await StatusAgenda.count({
                where: {
                    status_agenda: 'pending',
                    id_status_agenda: {
                        [Op.in]: sequelize.literal(`(
                            SELECT id_status_agenda 
                            FROM "StatusAgenda" AS sa2 
                            WHERE sa2.id_agenda = "StatusAgenda".id_agenda 
                            ORDER BY sa2."createdAt" DESC 
                            LIMIT 1
                        )`)
                    }
                }
            });

            const approvedToday = await StatusAgenda.count({
                where: {
                    status_agenda: 'approved_sespri',
                    createdAt: {
                        [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)),
                        [Op.lt]: new Date(new Date().setHours(23, 59, 59, 999))
                    }
                }
            });

            const rejected = await StatusAgenda.count({
                where: {
                    status_agenda: 'rejected_sespri',
                    id_status_agenda: {
                        [Op.in]: sequelize.literal(`(
                            SELECT id_status_agenda 
                            FROM "StatusAgenda" AS sa2 
                            WHERE sa2.id_agenda = "StatusAgenda".id_agenda 
                            ORDER BY sa2."createdAt" DESC 
                            LIMIT 1
                        )`)
                    }
                }
            });

            const totalProcessed = await StatusAgenda.count({
                where: {
                    status_agenda: { [Op.ne]: 'pending' },
                    id_status_agenda: {
                        [Op.in]: sequelize.literal(`(
                            SELECT id_status_agenda 
                            FROM "StatusAgenda" AS sa2 
                            WHERE sa2.id_agenda = "StatusAgenda".id_agenda 
                            ORDER BY sa2."createdAt" DESC 
                            LIMIT 1
                        )`)
                    }
                }
            });

            // 2. Today's Agendas with Progress Reports
            const todayAgendas = await Agenda.findAll({
                where: { 
                    tanggal_kegiatan: today,
                    id_agenda: {
                        [Op.in]: sequelize.literal(`(
                            SELECT sa1.id_agenda
                            FROM "StatusAgenda" sa1
                            WHERE sa1.id_status_agenda = (
                                SELECT sa2.id_status_agenda
                                FROM "StatusAgenda" sa2
                                WHERE sa2.id_agenda = sa1.id_agenda
                                ORDER BY sa2."createdAt" DESC
                                LIMIT 1
                            )
                            AND sa1.status_agenda IN ('approved_ajudan', 'delegated', 'completed')
                        )`)
                    }
                },
                include: [
                    {
                        model: StatusAgenda,
                        as: 'statusAgendas',
                        required: true,
                        separate: true,
                        limit: 1,
                        order: [['createdAt', 'DESC']]
                    },
                    {
                        model: AgendaPimpinan,
                        as: 'agendaPimpinans',
                        include: [{
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
                        }]
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
                                include: [
                                    { model: JabatanPimpinan, as: 'jabatan' },
                                    { model: Pimpinan, as: 'pimpinan', attributes: ['nama_pimpinan'] }
                                ]
                            },
                            {
                                model: PeriodeJabatan,
                                as: 'periodeJabatanHadir',
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
                        separate: true,
                        include: [{
                            model: LaporanKegiatan,
                            as: 'laporanKegiatans',
                            attributes: ['id_laporan', 'deskripsi_laporan', 'catatan_laporan', 'dokumentasi_laporan', 'createdAt']
                        }]
                    }
                ]
            });

            // 3. Pending Verification List (limit 5)
            const pendingRequests = await Agenda.findAll({
                where: {
                    id_agenda: {
                        [Op.in]: sequelize.literal(`(
                            SELECT sa1.id_agenda
                            FROM "StatusAgenda" sa1
                            WHERE sa1.id_status_agenda = (
                                SELECT sa2.id_status_agenda
                                FROM "StatusAgenda" sa2
                                WHERE sa2.id_agenda = sa1.id_agenda
                                ORDER BY sa2."createdAt" DESC
                                LIMIT 1
                            )
                            AND sa1.status_agenda = 'pending'
                        )`)
                    }
                },
                limit: 5,
                order: [['updatedAt', 'DESC']],
                include: [
                    {
                        model: User,
                        as: 'pemohon',
                        attributes: ['nama']
                    }
                ]
            });

            // 4. Upcoming Agendas for Sidebar/List (limit 5)
            const upcomingAgenda = await Agenda.findAll({
                where: {
                    tanggal_kegiatan: { [Op.gt]: today }
                },
                limit: 5,
                order: [['updatedAt', 'DESC']],
                include: [
                    {
                        model: StatusAgenda,
                        as: 'statusAgendas',
                        where: { status_agenda: { [Op.in]: ['approved_ajudan', 'delegated', 'completed'] } },
                        required: true
                    }
                ]
            });

            const dashboardData = {
                stats: {
                    pendingVerification,
                    approvedToday,
                    rejected,
                    totalProcessed
                },
                todayAgendas,
                pendingRequests: pendingRequests.map(r => ({
                    nomor_surat: r.nomor_surat,
                    pemohon: r.pemohon?.nama || 'Unknown',
                    perihal: r.perihal,
                    tanggal_surat: r.tanggal_surat,
                    status: 'Pending'
                })),
                upcomingAgenda: upcomingAgenda.map(a => ({
                    kegiatan: a.nama_kegiatan,
                    tanggal: a.tanggal_kegiatan,
                    waktu: a.waktu_mulai
                }))
            };

            return this.sendResponse(res, 200, true, 'Data dashboard sespri berhasil diambil', dashboardData);
        } catch (error) {
            return this.sendError(res, error, 'Gagal mengambil data dashboard sespri');
    }
    }

    async getKasubagMediaStats(req, res) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();

            // 1. Stats Cards data
            const staffList = await User.findAll({
                where: { id_role: 'R006' }, // Role R006 is Staff Media
                attributes: ['id_user', 'nama']
            });
            const totalStaff = staffList.length;

            const reviewDraftsCount = await DraftBerita.count({
                where: { status_draft: 'draft' }
            });

            const approvedDraftsCount = await DraftBerita.count({
                where: { status_draft: 'approved' }
            });

            const activeAssignmentsCount = await Penugasan.count({
                where: {
                    status: { [Op.ne]: 'selesai' },
                    id_user_kasubag: req.user.id_user // Correct column name
                }
            });

            // 2. Today's Agendas
            const todayAgendas = await Agenda.findAll({
                where: { 
                    tanggal_kegiatan: today,
                    id_agenda: {
                        [Op.in]: sequelize.literal(`(
                            SELECT sa1.id_agenda
                            FROM "StatusAgenda" sa1
                            WHERE sa1.id_status_agenda = (
                                SELECT sa2.id_status_agenda
                                FROM "StatusAgenda" sa2
                                WHERE sa2.id_agenda = sa1.id_agenda
                                ORDER BY sa2."createdAt" DESC
                                LIMIT 1
                            )
                            AND sa1.status_agenda IN ('approved_sespri', 'approved_ajudan', 'delegated', 'completed')
                        )`)
                    }
                },
                include: [
                    {
                        model: StatusAgenda,
                        as: 'statusAgendas',
                        required: true,
                        separate: true,
                        limit: 1,
                        order: [['createdAt', 'DESC']]
                    },
                    {
                        model: AgendaPimpinan,
                        as: 'agendaPimpinans',
                        include: [{
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
                        }]
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
                                include: [
                                    { model: JabatanPimpinan, as: 'jabatan' },
                                    { model: Pimpinan, as: 'pimpinan', attributes: ['nama_pimpinan'] }
                                ]
                            },
                            {
                                model: PeriodeJabatan,
                                as: 'periodeJabatanHadir',
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
                        separate: true,
                        include: [{
                            model: LaporanKegiatan,
                            as: 'laporanKegiatans',
                            attributes: ['id_laporan', 'deskripsi_laporan', 'catatan_laporan', 'dokumentasi_laporan', 'createdAt']
                        }]
                    }
                ]
            });

            const allAssignmentsThisMonth = await Penugasan.findAll({
                where: {
                    tanggal_penugasan: {
                        [Op.gte]: new Date(currentYear, currentMonth, 1),
                        [Op.lt]: new Date(currentYear, currentMonth + 1, 1)
                    }
                },
                include: [{
                    model: SlotAgendaStaff,
                    as: 'slotAgendaStaffs',
                    attributes: ['id_user_staff']
                }]
            });

            const workload = staffList.map(staf => {
                // A staff member has a task if they are assigned to at least one slot in a penugasan
                const tasks = allAssignmentsThisMonth.filter(p => 
                    p.slotAgendaStaffs.some(s => s.id_user_staff === staf.id_user)
                );
                const count = tasks.length;
                return {
                    nama: staf.nama,
                    tugas: count,
                    persentase: Math.min(Math.round((count / 10) * 100), 100)
                };
            }).sort((a, b) => b.tugas - a.tugas);

            // 4. Draft Perlu Review
            const draftPerluReview = await DraftBerita.findAll({
                where: { status_draft: 'draft' },
                limit: 5,
                order: [['updatedAt', 'DESC']],
                include: [
                    {
                        model: User,
                        as: 'staff',
                        attributes: ['nama']
                    }
                ]
            });

            // 5. Perlu Penugasan
            const agendasForAssign = await Agenda.findAll({
                where: {
                    tanggal_kegiatan: { [Op.gte]: today },
                    id_agenda: {
                        [Op.in]: sequelize.literal(`(
                            SELECT sa1.id_agenda
                            FROM "StatusAgenda" sa1
                            WHERE sa1.id_status_agenda = (
                                SELECT sa2.id_status_agenda
                                FROM "StatusAgenda" sa2
                                WHERE sa2.id_agenda = sa1.id_agenda
                                ORDER BY sa2."createdAt" DESC
                                LIMIT 1
                            )
                            AND sa1.status_agenda IN ('approved_ajudan', 'delegated', 'completed')
                            AND sa1.id_agenda NOT IN (SELECT id_agenda FROM "Penugasans" WHERE jenis_penugasan = 'media')
                        )`)
                    }
                },
                limit: 5,
                order: [['updatedAt', 'DESC']]
            });

            const dashboardData = {
                stats: {
                    totalStaff,
                    reviewDraftsCount,
                    approvedDraftsCount,
                    activeAssignments: activeAssignmentsCount
                },
                todayAgendas,
                workload,
                draftPerluReview,
                perluPenugasan: agendasForAssign.map(a => ({
                    id: a.id_agenda,
                    kegiatan: a.nama_kegiatan,
                    waktu: `${a.waktu_mulai.slice(0, 5)} - ${a.waktu_selesai.slice(0, 5)}`,
                    tanggal: a.tanggal_kegiatan
                }))
            };

            return this.sendResponse(res, 200, true, 'Data dashboard kasubag media berhasil diambil', dashboardData);
        } catch (error) {
            return this.sendError(res, error, 'Gagal mengambil data dashboard kasubag media');
        }
    }

    async getKasubagProtokolStats(req, res) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();

            // 1. Stats Cards data
            const staffList = await User.findAll({
                where: { id_role: 'R007' }, // Role R007 is Staff Protokol
                attributes: ['id_user', 'nama']
            });
            const totalStaff = staffList.length;

            const activeAssignmentsCount = await Penugasan.count({
                where: {
                    id_user_kasubag: req.user.id_user,
                    status: { [Op.ne]: 'selesai' }
                }
            });

            const completedAssignmentsCount = await Penugasan.count({
                where: {
                    id_user_kasubag: req.user.id_user,
                    status: 'selesai'
                }
            });

            const onProgressAssignmentsCount = await Penugasan.count({
                where: {
                    id_user_kasubag: req.user.id_user,
                    status: 'progress'
                }
            });

            // 2. Today's Agendas
            const todayAgendas = await Agenda.findAll({
                where: { 
                    tanggal_kegiatan: today,
                    id_agenda: {
                        [Op.in]: sequelize.literal(`(
                            SELECT sa1.id_agenda
                            FROM "StatusAgenda" sa1
                            WHERE sa1.id_status_agenda = (
                                SELECT sa2.id_status_agenda
                                FROM "StatusAgenda" sa2
                                WHERE sa2.id_agenda = sa1.id_agenda
                                ORDER BY sa2."createdAt" DESC
                                LIMIT 1
                            )
                            AND sa1.status_agenda IN ('approved_sespri', 'approved_ajudan', 'delegated', 'completed')
                        )`)
                    }
                },
                include: [
                    {
                        model: StatusAgenda,
                        as: 'statusAgendas',
                        required: true,
                        separate: true,
                        limit: 1,
                        order: [['createdAt', 'DESC']]
                    },
                    {
                        model: AgendaPimpinan,
                        as: 'agendaPimpinans',
                        include: [{
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
                        }]
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
                                include: [
                                    { model: JabatanPimpinan, as: 'jabatan' },
                                    { model: Pimpinan, as: 'pimpinan', attributes: ['nama_pimpinan'] }
                                ]
                            },
                            {
                                model: PeriodeJabatan,
                                as: 'periodeJabatanHadir',
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
                        separate: true,
                        include: [{
                            model: LaporanKegiatan,
                            as: 'laporanKegiatans',
                            attributes: ['id_laporan', 'deskripsi_laporan', 'catatan_laporan', 'dokumentasi_laporan', 'createdAt']
                        }]
                    }
                ]
            });

            // 3. Beban Kerja Staf (Bulan Ini)
            const allAssignmentsThisMonth = await Penugasan.findAll({
                where: {
                    tanggal_penugasan: {
                        [Op.gte]: new Date(currentYear, currentMonth, 1),
                        [Op.lt]: new Date(currentYear, currentMonth + 1, 1)
                    },
                    jenis_penugasan: 'protokol'
                },
                include: [{
                    model: SlotAgendaStaff,
                    as: 'slotAgendaStaffs',
                    attributes: ['id_user_staff']
                }]
            });

            const workload = staffList.map(staf => {
                const tasks = allAssignmentsThisMonth.filter(p => 
                    p.slotAgendaStaffs.some(s => s.id_user_staff === staf.id_user)
                );
                const count = tasks.length;
                return {
                    nama: staf.nama,
                    tugas: count,
                    persentase: Math.min(Math.round((count / 10) * 100), 100)
                };
            }).sort((a, b) => b.tugas - a.tugas);

            // 4. Perlu Penugasan
            const agendasForAssign = await Agenda.findAll({
                where: {
                    tanggal_kegiatan: { [Op.gte]: today },
                    id_agenda: {
                        [Op.in]: sequelize.literal(`(
                            SELECT sa1.id_agenda
                            FROM "StatusAgenda" sa1
                            WHERE sa1.id_status_agenda = (
                                SELECT sa2.id_status_agenda
                                FROM "StatusAgenda" sa2
                                WHERE sa2.id_agenda = sa1.id_agenda
                                ORDER BY sa2."createdAt" DESC
                                LIMIT 1
                            )
                            AND sa1.status_agenda IN ('approved_ajudan', 'delegated', 'completed')
                            AND sa1.id_agenda NOT IN (SELECT id_agenda FROM "Penugasans" WHERE jenis_penugasan = 'protokol')
                        )`)
                    }
                },
                limit: 5,
                order: [['updatedAt', 'DESC']]
            });

            const dashboardData = {
                stats: {
                    totalStaff,
                    activeAssignments: activeAssignmentsCount,
                    completedAssignments: completedAssignmentsCount,
                    onProgressAssignments: onProgressAssignmentsCount
                },
                todayAgendas,
                workload,
                perluPenugasan: agendasForAssign.map(a => ({
                    id: a.id_agenda,
                    kegiatan: a.nama_kegiatan,
                    waktu: `${a.waktu_mulai.slice(0, 5)} - ${a.waktu_selesai.slice(0, 5)}`,
                    tanggal: a.tanggal_kegiatan,
                    perihal: a.perihal
                }))
            };

            return this.sendResponse(res, 200, true, 'Data dashboard kasubag protokol berhasil diambil', dashboardData);
        } catch (error) {
            return this.sendError(res, error, 'Gagal mengambil data dashboard kasubag protokol');
        }
    }

    async getStafMediaStats(req, res) {
        try {
            const { id_user } = req.user;
            const today = new Date().toISOString().split('T')[0];

            // 1. Stats from DraftBerita
            const pendingReview = await DraftBerita.count({ where: { id_user_staff: id_user, status_draft: 'draft' } });
            const approvedCount = await DraftBerita.count({ where: { id_user_staff: id_user, status_draft: 'approved' } });
            const revisionNeeded = await DraftBerita.count({ where: { id_user_staff: id_user, status_draft: 'review' } });
            
            // 1.1 Total assignments for this staff
            const assignedPenugasansCount = await SlotAgendaStaff.count({
                where: { id_user_staff: id_user },
                distinct: true,
                col: 'id_penugasan'
            });

            // 2. Today's Agendas
            const todayAgendas = await Agenda.findAll({
                where: { 
                    tanggal_kegiatan: today,
                    id_agenda: {
                        [Op.in]: sequelize.literal(`(
                            SELECT sa1.id_agenda
                            FROM "StatusAgenda" sa1
                            WHERE sa1.id_status_agenda = (
                                SELECT sa2.id_status_agenda
                                FROM "StatusAgenda" sa2
                                WHERE sa2.id_agenda = sa1.id_agenda
                                ORDER BY sa2."createdAt" DESC
                                LIMIT 1
                            )
                            AND sa1.status_agenda IN ('approved_ajudan', 'delegated', 'completed')
                        )`)
                    }
                },
                include: [
                    {
                        model: StatusAgenda,
                        as: 'statusAgendas',
                        required: true,
                        separate: true,
                        limit: 1,
                        order: [['createdAt', 'DESC']]
                    },
                    {
                        model: AgendaPimpinan,
                        as: 'agendaPimpinans',
                        include: [{
                            model: PeriodeJabatan,
                            as: 'periodeJabatan',
                            include: [
                                { model: JabatanPimpinan, as: 'jabatan' },
                                { model: Pimpinan, as: 'pimpinan', attributes: ['nama_pimpinan'] }
                            ]
                        }]
                    }
                ]
            });

            // 3. My Assignments (Today)
            const myAssignments = await Penugasan.findAll({
                where: {
                    jenis_penugasan: 'media',
                    id_penugasan: {
                        [Op.in]: sequelize.literal(`(
                            SELECT id_penugasan 
                            FROM "SlotAgendaStaffs" 
                            WHERE id_user_staff = '${id_user}' 
                            AND tanggal = '${today}'
                        )`)
                    }
                },
                include: [
                    {
                        model: Agenda,
                        as: 'agenda',
                        attributes: ['id_agenda', 'nama_kegiatan', 'tanggal_kegiatan', 'waktu_mulai', 'waktu_selesai', 'lokasi_kegiatan'],
                        include: [
                            {
                                model: AgendaPimpinan,
                                as: 'agendaPimpinans',
                                include: [
                                    {
                                        model: PeriodeJabatan,
                                        as: 'periodeJabatan',
                                        include: [
                                            { model: Pimpinan, as: 'pimpinan', attributes: ['nama_pimpinan'] }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });

            // 4. Recent Drafts
            const recentDrafts = await DraftBerita.findAll({
                where: { id_user_staff: id_user },
                limit: 5,
                order: [['createdAt', 'DESC']],
                include: [
                    {
                        model: Penugasan,
                        as: 'penugasan',
                        include: [{
                            model: Agenda,
                            as: 'agenda',
                            attributes: ['nama_kegiatan']
                        }]
                    }
                ]
            });

            const dashboardData = {
                stats: {
                    totalTasks: assignedPenugasansCount,
                    pendingReview,
                    approved: approvedCount,
                    revisionNeeded
                },
                todayAgendas,
                myAssignments: myAssignments.map(p => ({
                    id: p.id_penugasan,
                    judul_kegiatan: p.agenda?.nama_kegiatan || '-',
                    pimpinan: p.agenda?.agendaPimpinans?.map(ap => ap.periodeJabatan?.pimpinan?.nama_pimpinan).join(', ') || '-',
                    waktu: `${p.agenda?.waktu_mulai?.slice(0, 5) || '--:--'} - ${p.agenda?.waktu_selesai?.slice(0, 5) || '--:--'}`,
                    tempat: p.agenda?.lokasi_kegiatan || '-',
                    status_draft: 'Check detail' // Logic for draft status per assignment can be complex, will simplify for now
                })),
                recentDrafts: recentDrafts.map(d => ({
                    id: d.id_draft_berita,
                    judul_draft: d.judul_berita,
                    judul_kegiatan: d.penugasan?.agenda?.nama_kegiatan || '-',
                    tanggal_upload: d.createdAt,
                    status: d.status_draft,
                    feedback: d.catatan
                }))
            };

            return this.sendResponse(res, 200, true, 'Data dashboard staf media berhasil diambil', dashboardData);
        } catch (error) {
            return this.sendError(res, error, 'Gagal mengambil data dashboard staf media');
        }
    }

    async getStafProtokolStats(req, res) {
        try {
            const { id_user } = req.user;
            const today = new Date().toISOString().split('T')[0];

            // 1. Stats from Penugasan (via SlotAgendaStaff)
            const assignedPenugasanIds = await SlotAgendaStaff.findAll({
                where: { id_user_staff: id_user },
                attributes: [[sequelize.fn('DISTINCT', sequelize.col('id_penugasan')), 'id_penugasan']],
                raw: true
            });
            const penugasanIds = [...new Set(assignedPenugasanIds.map(p => p.id_penugasan).filter(id => id))];

            const totalTasks = penugasanIds.length;
            const onProgress = await Penugasan.count({
                where: {
                    id_penugasan: { [Op.in]: penugasanIds },
                    status: 'progress'
                }
            });
            const completed = await Penugasan.count({
                where: {
                    id_penugasan: { [Op.in]: penugasanIds },
                    status: 'selesai'
                }
            });
            const pending = await Penugasan.count({
                where: {
                    id_penugasan: { [Op.in]: penugasanIds },
                    status: 'pending'
                }
            });

            // 2. Today's Agendas
            const todayAgendas = await Agenda.findAll({
                where: { 
                    tanggal_kegiatan: today,
                    id_agenda: {
                        [Op.in]: sequelize.literal(`(
                            SELECT sa1.id_agenda
                            FROM "StatusAgenda" sa1
                            WHERE sa1.id_status_agenda = (
                                SELECT sa2.id_status_agenda
                                FROM "StatusAgenda" sa2
                                WHERE sa2.id_agenda = sa1.id_agenda
                                ORDER BY sa2."createdAt" DESC
                                LIMIT 1
                            )
                            AND sa1.status_agenda IN ('approved_ajudan', 'delegated', 'completed')
                        )`)
                    }
                },
                include: [
                    {
                        model: StatusAgenda,
                        as: 'statusAgendas',
                        required: true,
                        separate: true,
                        limit: 1,
                        order: [['createdAt', 'DESC']]
                    },
                    {
                        model: AgendaPimpinan,
                        as: 'agendaPimpinans',
                        include: [{
                            model: PeriodeJabatan,
                            as: 'periodeJabatan',
                            include: [
                                { model: JabatanPimpinan, as: 'jabatan' },
                                { model: Pimpinan, as: 'pimpinan', attributes: ['nama_pimpinan'] }
                            ]
                        }]
                    },
                    {
                        model: Penugasan,
                        as: 'penugasans',
                        separate: true,
                        include: [{
                            model: LaporanKegiatan,
                            as: 'laporanKegiatans'
                        }]
                    }
                ]
            });

            // 3. My Tasks (Today or Active)
            const myTasks = await Penugasan.findAll({
                where: {
                    id_penugasan: { [Op.in]: penugasanIds },
                    status: { [Op.not]: 'selesai' }
                },
                include: [
                    {
                        model: Agenda,
                        as: 'agenda',
                        attributes: ['id_agenda', 'nama_kegiatan', 'tanggal_kegiatan', 'waktu_mulai', 'waktu_selesai', 'lokasi_kegiatan'],
                        include: [
                            {
                                model: AgendaPimpinan,
                                as: 'agendaPimpinans',
                                include: [
                                    {
                                        model: PeriodeJabatan,
                                        as: 'periodeJabatan',
                                        include: [
                                            { model: Pimpinan, as: 'pimpinan', attributes: ['nama_pimpinan'] }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        model: User,
                        as: 'kasubag',
                        attributes: ['nama']
                    }
                ],
                order: [['createdAt', 'DESC']],
                limit: 5
            });

            const dashboardData = {
                stats: {
                    totalTasks,
                    onProgress,
                    completed,
                    pending
                },
                todayAgendas,
                myTasks: myTasks.map(p => ({
                    id: p.id_penugasan,
                    judul: p.agenda?.nama_kegiatan || '-',
                    penugasan_dari: p.kasubag?.nama || 'Kasubag',
                    tanggal: p.agenda?.tanggal_kegiatan,
                    waktu: `${p.agenda?.waktu_mulai?.slice(0, 5) || '--:--'} - ${p.agenda?.waktu_selesai?.slice(0, 5) || '--:--'}`,
                    lokasi: p.agenda?.lokasi_kegiatan || '-',
                    status: p.status === 'pending' ? 'Belum Dimulai' : p.status === 'progress' ? 'Berlangsung' : 'Selesai',
                    instruksi: p.deskripsi_penugasan || '-',
                    jumlah_progress: 0 // Will need LaporanKegiatan count if needed
                }))
            };

            return this.sendResponse(res, 200, true, 'Data dashboard staf protokol berhasil diambil', dashboardData);
        } catch (error) {
            return this.sendError(res, error, 'Gagal mengambil data dashboard staf protokol');
        }
    }
}

module.exports = new DashboardController();
