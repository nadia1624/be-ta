const BaseController = require('./BaseController');
const { User, Agenda, StatusAgenda, Penugasan, LaporanKegiatan, AgendaPimpinan, PeriodeJabatan, JabatanPimpinan, Pimpinan, sequelize } = require('../models');
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
                order: [['createdAt', 'DESC']],
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
                        limit: 1,
                        order: [['createdAt', 'DESC']]
                    }
                ]
            });

            // 5. Upcoming Agendas (limit 5)
            // Filter agendas with confirmed status that happen today or in the future
            const upcomingAgenda = await Agenda.findAll({
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
                order: [['tanggal_kegiatan', 'ASC'], ['waktu_mulai', 'ASC']],
                include: [
                    {
                        model: StatusAgenda,
                        as: 'statusAgendas',
                        required: true,
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
                order: [['createdAt', 'DESC']],
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
                order: [['tanggal_kegiatan', 'ASC']],
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
                todayAgendas: todayAgendas.map(a => ({
                    id: a.id_agenda,
                    kegiatan: a.nama_kegiatan,
                    pimpinan: a.agendaPimpinans?.[0]?.periodeJabatan?.pimpinan?.nama_pimpinan || '-',
                    jabatan: a.agendaPimpinans?.[0]?.periodeJabatan?.jabatan?.nama_jabatan || '-',
                    waktu: `${a.waktu_mulai} - ${a.waktu_selesai}`,
                    tempat: a.lokasi_kegiatan,
                    status: a.statusAgendas?.[0]?.status_agenda === 'completed' ? 'Selesai' : 
                            a.statusAgendas?.[0]?.status_agenda === 'delegated' ? 'Diwakilkan' : 'Berlangsung',
                    progress_reports: a.penugasans?.flatMap(p => p.laporanKegiatans?.map(l => ({
                        id: l.id_laporan,
                        tipe: l.deskripsi_laporan,
                        deskripsi: l.catatan_laporan,
                        foto: l.dokumentasi_laporan ? l.dokumentasi_laporan.split(',').length : 0,
                        waktu: new Date(l.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                    }))) || []
                })),
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
}

module.exports = new DashboardController();
