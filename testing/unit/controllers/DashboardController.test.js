// Mock Hoisted Variables for Models
const mockUser = {
    count: jest.fn(),
    findAll: jest.fn(),
};

const mockAgenda = {
    count: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
};

const mockStatusAgenda = {
    count: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
};

const mockPenugasan = {
    count: jest.fn(),
    findAll: jest.fn(),
};

const mockDraftBerita = {
    count: jest.fn(),
    findAll: jest.fn(),
};

const mockSlotAgendaStaff = {
    count: jest.fn(),
    findAll: jest.fn(),
};

const mockLaporanKegiatan = {
    findAll: jest.fn(),
};

const mockSequelize = {
    literal: jest.fn(val => val),
    fn: jest.fn((f, c) => `${f}(${c})`),
    col: jest.fn(val => val),
};

// Mock the models module
jest.mock('../../../models', () => ({
    User: mockUser,
    Agenda: mockAgenda,
    StatusAgenda: mockStatusAgenda,
    Penugasan: mockPenugasan,
    DraftBerita: mockDraftBerita,
    SlotAgendaStaff: mockSlotAgendaStaff,
    LaporanKegiatan: mockLaporanKegiatan,
    AgendaPimpinan: {},
    SlotAgendaPimpinan: {},
    SlotWaktu: {},
    PeriodeJabatan: {},
    JabatanPimpinan: {},
    Pimpinan: {},
    sequelize: mockSequelize,
}));

// Mock Op from sequelize
jest.mock('sequelize', () => {
    const actual = jest.requireActual('sequelize');
    return {
        ...actual,
        Op: {
            in: Symbol('in'),
            gte: Symbol('gte'),
            lt: Symbol('lt'),
            ne: Symbol('ne'),
            gt: Symbol('gt'),
            not: Symbol('not'),
            col: Symbol('col'),
        }
    };
});

const DashboardController = require('../../../controllers/dashboardController');

describe('DashboardController Unit Tests', () => {
    let req, res;
    let responseSpy, errorSpy;

    beforeEach(() => {
        req = {
            user: { id_user: 'U001', nama_role: 'Admin' },
            body: {},
            params: {},
            query: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        // Spy on BaseController methods
        responseSpy = jest.spyOn(DashboardController, 'sendResponse').mockImplementation(() => {});
        errorSpy = jest.spyOn(DashboardController, 'sendError').mockImplementation(() => {});

        jest.clearAllMocks();
    });

    afterEach(() => {
        responseSpy.mockRestore();
        errorSpy.mockRestore();
    });

    describe('1. getAdminStats()', () => {
        test('Success: Stats counts mapping', async () => {
            mockUser.count.mockResolvedValue(10);
            mockAgenda.count.mockResolvedValue(20);
            mockStatusAgenda.count.mockResolvedValueOnce(5).mockResolvedValueOnce(8);
            mockAgenda.findAll.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

            await DashboardController.getAdminStats(req, res);

            expect(responseSpy).toHaveBeenCalledWith(res, 200, true, expect.any(String), expect.objectContaining({
                stats: { totalUsers: 10, totalAgenda: 20, pendingRequests: 5, confirmedAgendas: 8 }
            }));
        });

        test('Success: Recent Requests mapping with fallbacks', async () => {
            const mockRecent = [
                { nomor_surat: 'S1', perihal: 'P1', tanggal_surat: 'D1', pemohon: { nama: 'User A' }, statusAgendas: [{ status_agenda: 'confirmed' }] },
                { nomor_surat: 'S2', perihal: 'P2', tanggal_surat: 'D2', pemohon: null, statusAgendas: [] }
            ];
            mockUser.count.mockResolvedValue(0);
            mockAgenda.count.mockResolvedValue(0);
            mockStatusAgenda.count.mockResolvedValue(0);
            mockAgenda.findAll.mockResolvedValueOnce(mockRecent).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

            await DashboardController.getAdminStats(req, res);

            const result = responseSpy.mock.calls[0][4];
            expect(result.recentRequests[0].pemohon).toBe('User A');
            expect(result.recentRequests[0].status).toBe('confirmed');
            expect(result.recentRequests[1].pemohon).toBe('Unknown');
            expect(result.recentRequests[1].status).toBe('pending');
        });

        test('Success: Upcoming Agenda mapping (Labels & Pimpinan join)', async () => {
            mockUser.count.mockResolvedValue(0);
            mockAgenda.count.mockResolvedValue(0);
            mockStatusAgenda.count.mockResolvedValue(0);
            mockAgenda.findAll.mockResolvedValueOnce([]); // recent
            mockAgenda.findAll.mockResolvedValueOnce([{ id_agenda: 'A1' }, { id_agenda: 'A2' }, { id_agenda: 'A3' }]); // ids
            
            const mockDetails = [
                { 
                    nama_kegiatan: 'K1', statusAgendas: [{ status_agenda: 'approved_ajudan' }],
                    agendaPimpinans: [{ periodeJabatan: { pimpinan: { nama_pimpinan: 'Pim A' } } }]
                },
                { 
                    nama_kegiatan: 'K2', statusAgendas: [{ status_agenda: 'delegated' }],
                    agendaPimpinans: [{ periodeJabatan: { pimpinan: { nama_pimpinan: 'Pim B' } } }, { periodeJabatan: { pimpinan: { nama_pimpinan: 'Pim C' } } }]
                },
                { 
                    nama_kegiatan: 'K3', statusAgendas: [{ status_agenda: 'completed' }],
                    agendaPimpinans: []
                }
            ];
            mockAgenda.findAll.mockResolvedValueOnce(mockDetails);

            await DashboardController.getAdminStats(req, res);

            const result = responseSpy.mock.calls[0][4];
            expect(result.upcomingAgenda[0].status).toBe('Terkonfirmasi');
            expect(result.upcomingAgenda[0].nama_pimpinan).toBe('Pim A');
            
            expect(result.upcomingAgenda[1].status).toBe('Diwakilkan');
            expect(result.upcomingAgenda[1].nama_pimpinan).toBe('Pim B, Pim C');
            
            expect(result.upcomingAgenda[2].status).toBe('Selesai');
            expect(result.upcomingAgenda[2].nama_pimpinan).toBe('-');
        });

        test('Error: Handle database failure', async () => {
            mockUser.count.mockRejectedValue(new Error('Fatal'));
            await DashboardController.getAdminStats(req, res);
            expect(errorSpy).toHaveBeenCalled();
            expect(responseSpy).not.toHaveBeenCalled();
        });
    });

    describe('2. getSespriStats()', () => {
        test('Success: Stats counts and Today list', async () => {
            mockStatusAgenda.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2).mockResolvedValueOnce(1).mockResolvedValueOnce(7);
            mockAgenda.findAll.mockResolvedValueOnce(['Today 1']).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

            await DashboardController.getSespriStats(req, res);

            expect(responseSpy).toHaveBeenCalledWith(res, 200, true, expect.any(String), expect.objectContaining({
                stats: { pendingVerification: 4, approvedToday: 2, rejected: 1, totalProcessed: 7 },
                todayAgendas: ['Today 1']
            }));
        });

        test('Success: Pending & Upcoming list mapping', async () => {
            mockStatusAgenda.count.mockResolvedValue(0);
            mockAgenda.findAll.mockResolvedValueOnce([]); // today
            mockAgenda.findAll.mockResolvedValueOnce([
                { nomor_surat: 'S1', pemohon: { nama: 'Pemohon A' } },
                { nomor_surat: 'S2', pemohon: null }
            ]); // pending list
            mockAgenda.findAll.mockResolvedValueOnce([
                { nama_kegiatan: 'K1', tanggal_kegiatan: '2024-01-01', waktu_mulai: '08:00' }
            ]); // upcoming

            await DashboardController.getSespriStats(req, res);

            const result = responseSpy.mock.calls[0][4];
            expect(result.pendingRequests[0].pemohon).toBe('Pemohon A');
            expect(result.pendingRequests[1].pemohon).toBe('Unknown');
            expect(result.pendingRequests[0].status).toBe('Pending');
            
            expect(result.upcomingAgenda[0]).toEqual({ kegiatan: 'K1', tanggal: '2024-01-01', waktu: '08:00' });
        });

        test('Error: Handle failure', async () => {
            mockStatusAgenda.count.mockRejectedValue(new Error('Fail'));
            await DashboardController.getSespriStats(req, res);
            expect(errorSpy).toHaveBeenCalled();
        });
    });

    describe('3. getKasubagMediaStats()', () => {
        test('Success: Workload sorting and cap at 100%', async () => {
            mockUser.findAll.mockResolvedValue([
                { id_user: 'S1', nama: 'Staff A' },
                { id_user: 'S2', nama: 'Staff B' },
                { id_user: 'S3', nama: 'Staff C' }
            ]);
            mockDraftBerita.count.mockResolvedValue(0);
            mockPenugasan.count.mockResolvedValue(0);
            mockAgenda.findAll.mockResolvedValue([]);
            
            // Mock workload: S1 has 12 tasks (cap 100%), S2 has 5 tasks (50%), S3 has 0.
            const manyTasks = Array(12).fill({ slotAgendaStaffs: [{ id_user_staff: 'S1' }] });
            const someTasks = Array(5).fill({ slotAgendaStaffs: [{ id_user_staff: 'S2' }] });
            mockPenugasan.findAll.mockResolvedValueOnce([...manyTasks, ...someTasks]); 

            await DashboardController.getKasubagMediaStats(req, res);

            const result = responseSpy.mock.calls[0][4];
            expect(result.workload[0]).toEqual({ nama: 'Staff A', tugas: 12, persentase: 100 });
            expect(result.workload[1]).toEqual({ nama: 'Staff B', tugas: 5, persentase: 50 });
            expect(result.workload[2]).toEqual({ nama: 'Staff C', tugas: 0, persentase: 0 });
        });

        test('Success: Mapping perluPenugasan and DraftPerluReview', async () => {
            mockUser.findAll.mockResolvedValue([]);
            mockPenugasan.count.mockResolvedValue(0);
            mockPenugasan.findAll.mockResolvedValue([]);
            
            mockAgenda.findAll.mockResolvedValueOnce([]) // Today's
                .mockResolvedValueOnce([{
                    id_agenda: 'A1', nama_kegiatan: 'K1', waktu_mulai: '08:00', waktu_selesai: '09:00', tanggal_kegiatan: '2024-01-01'
                }]); // Perlu Penugasan
            
            mockDraftBerita.findAll.mockResolvedValueOnce([{
                id_draft_berita: 'D1', status_draft: 'draft', staff: { nama: 'Staf X' }
            }]);

            await DashboardController.getKasubagMediaStats(req, res);
            const result = responseSpy.mock.calls[0][4];
            expect(result.perluPenugasan[0].kegiatan).toBe('K1');
            expect(result.draftPerluReview[0].staff.nama).toBe('Staf X');
        });

        test('Error: Handle failure', async () => {
            mockUser.findAll.mockRejectedValue(new Error('Fail'));
            await DashboardController.getKasubagMediaStats(req, res);
            expect(errorSpy).toHaveBeenCalled();
        });
    });

    describe('4. getKasubagProtokolStats()', () => {
        test('Success: Stats verification', async () => {
            mockUser.findAll.mockResolvedValue([]);
            mockPenugasan.count.mockResolvedValueOnce(5).mockResolvedValueOnce(10).mockResolvedValueOnce(2);
            mockAgenda.findAll.mockResolvedValue([]);
            mockPenugasan.findAll.mockResolvedValue([]);
            mockAgenda.findAll.mockResolvedValue([]);
            
            await DashboardController.getKasubagProtokolStats(req, res);

            expect(responseSpy).toHaveBeenCalledWith(res, 200, true, expect.any(String), expect.objectContaining({
                stats: { totalStaff: 0, activeAssignments: 5, completedAssignments: 10, onProgressAssignments: 2 }
            }));
        });

        test('Success: Workload and Perlu Penugasan mapping', async () => {
            mockUser.findAll.mockResolvedValue([{ id_user: 'S1', nama: 'Staf P' }]);
            mockPenugasan.count.mockResolvedValue(0);
            mockAgenda.findAll.mockResolvedValueOnce([]) // today
                .mockResolvedValueOnce([{
                    id_agenda: 'A1', nama_kegiatan: 'K1', waktu_mulai: '10:00:00', waktu_selesai: '11:00:00', tanggal_kegiatan: '2025-01-01', perihal: 'P1'
                }]); // assign
            mockPenugasan.findAll.mockResolvedValueOnce([{
                id_penugasan: 'P1',
                slotAgendaStaffs: [{ id_user_staff: 'S1' }]
            }]);

            await DashboardController.getKasubagProtokolStats(req, res);
            const result = responseSpy.mock.calls[0][4];
            expect(result.workload[0].nama).toBe('Staf P');
            expect(result.perluPenugasan[0].perihal).toBe('P1');
        });

        test('Error: Handle failure', async () => {
            mockUser.findAll.mockRejectedValue(new Error('Fail'));
            await DashboardController.getKasubagProtokolStats(req, res);
            expect(errorSpy).toHaveBeenCalled();
        });
    });

    describe('5. getStafMediaStats()', () => {
        test('Success: Mapping myAssignments and recentDrafts', async () => {
            req.user.id_user = 'SM1';
            mockDraftBerita.count.mockResolvedValue(1);
            mockSlotAgendaStaff.count.mockResolvedValue(10);
            mockAgenda.findAll.mockResolvedValue([]);
            
            const mockMyTasks = [{
                id_penugasan: 'PN1',
                agenda: {
                    nama_kegiatan: 'K1', waktu_mulai: '08:30:00', waktu_selesai: '17:00:00', lokasi_kegiatan: 'LOC',
                    agendaPimpinans: [{ periodeJabatan: { pimpinan: { nama_pimpinan: 'Pim X' } } }, { periodeJabatan: { pimpinan: { nama_pimpinan: 'Pim Y' } } }]
                }
            }];
            mockPenugasan.findAll.mockResolvedValueOnce(mockMyTasks);

            const mockDocs = [{ id_draft_berita: 'D1', judul_berita: 'Draft 1', status_draft: 'draft', catatan: 'Revise', createdAt: '2024-01-01' }];
            mockDraftBerita.findAll.mockResolvedValueOnce(mockDocs);

            await DashboardController.getStafMediaStats(req, res);

            const result = responseSpy.mock.calls[0][4];
            expect(result.myAssignments[0]).toEqual({
                id: 'PN1', judul_kegiatan: 'K1', pimpinan: 'Pim X, Pim Y', waktu: '08:30 - 17:00', tempat: 'LOC', status_draft: 'Check detail'
            });
            expect(result.recentDrafts[0]).toEqual({
                id: 'D1', judul_draft: 'Draft 1', judul_kegiatan: '-', tanggal_upload: '2024-01-01', status: 'draft', feedback: 'Revise'
            });
        });

        test('Edge: Handle missing time strings', async () => {
            req.user.id_user = 'SM1';
            mockDraftBerita.count.mockResolvedValue(0);
            mockSlotAgendaStaff.count.mockResolvedValue(0);
            mockAgenda.findAll.mockResolvedValue([]);
            mockPenugasan.findAll.mockResolvedValueOnce([{ agenda: { waktu_mulai: null, waktu_selesai: null } }]);
            mockDraftBerita.findAll.mockResolvedValueOnce([]);

            await DashboardController.getStafMediaStats(req, res);

            const result = responseSpy.mock.calls[0][4];
            expect(result.myAssignments[0].waktu).toBe('--:-- - --:--'); // Safe fallback after fix
        });
    });

    describe('6. getStafProtokolStats()', () => {
        test('Success: Mapping stats correctly', async () => {
            req.user.id_user = 'SP1';
            mockSlotAgendaStaff.findAll.mockResolvedValue([{ id_penugasan: 'PN1' }, { id_penugasan: 'PN1' }, { id_penugasan: 'PN2' }]);
            mockPenugasan.count.mockResolvedValueOnce(1).mockResolvedValueOnce(5).mockResolvedValueOnce(2);
            mockAgenda.findAll.mockResolvedValue([]);
            
            const mockTasks = [
                { id_penugasan: 'PN1', status: 'pending', agenda: { nama_kegiatan: 'K1', waktu_mulai: '08:00', waktu_selesai: '09:00' }, kasubag: { nama: 'Kasub A' } },
                { id_penugasan: 'PN2', status: 'progress', agenda: null, kasubag: null }
            ];
            mockPenugasan.findAll.mockResolvedValueOnce(mockTasks);

            await DashboardController.getStafProtokolStats(req, res);

            const result = responseSpy.mock.calls[0][4];
            expect(result.stats.totalTasks).toBe(2); // Unique count
            expect(result.myTasks[0].status).toBe('Belum Dimulai');
            expect(result.myTasks[0].penugasan_dari).toBe('Kasub A');
            
            expect(result.myTasks[1].judul).toBe('-');
            expect(result.myTasks[1].penugasan_dari).toBe('Kasubag');
        });

        test('Success: Mapping myTasks', async () => {
            req.user.id_user = 'SP1';
            mockSlotAgendaStaff.findAll.mockResolvedValue([]);
            mockPenugasan.count.mockResolvedValue(0);
            mockPenugasan.findAll.mockResolvedValueOnce([{
                id_penugasan: 'PN1',
                status: 'progress',
                agenda: { nama_kegiatan: 'Act 1', waktu_mulai: '07:00:00', waktu_selesai: '08:00:00', lokasi_kegiatan: 'Hall' }
            }]);

            await DashboardController.getStafProtokolStats(req, res);
            const result = responseSpy.mock.calls[0][4];
            expect(result.myTasks[0].judul).toBe('Act 1');
        });

        test('Error: Failed to fetch data', async () => {
            mockSlotAgendaStaff.findAll.mockRejectedValue(new Error('Fatal'));
            await DashboardController.getStafProtokolStats(req, res);
            expect(errorSpy).toHaveBeenCalled();
        });
    });

    describe('7. Additional Error Coverage', () => {
        test('getStafMediaStats Error', async () => {
            mockDraftBerita.count.mockRejectedValue(new Error('Fail'));
            await DashboardController.getStafMediaStats(req, res);
            expect(errorSpy).toHaveBeenCalled();
        });

        test('getKasubagProtokolStats Error', async () => {
            mockUser.findAll.mockRejectedValue(new Error('Fail'));
            await DashboardController.getKasubagProtokolStats(req, res);
            expect(errorSpy).toHaveBeenCalled();
        });

        test('getKasubagMediaStats Error', async () => {
            mockUser.findAll.mockRejectedValue(new Error('Fail'));
            await DashboardController.getKasubagMediaStats(req, res);
            expect(errorSpy).toHaveBeenCalled();
        });
    });
});
