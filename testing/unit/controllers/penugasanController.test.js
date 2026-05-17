// Mock objects must start with "mock" to be hoisted correctly for use in jest.mock()
const mockTransactionObj = {
    commit: jest.fn().mockResolvedValue(null),
    rollback: jest.fn().mockResolvedValue(null),
    LOCK: { UPDATE: 'UPDATE' }
};

const mockSequelizeObj = {
    transaction: jest.fn(() => Promise.resolve(mockTransactionObj)),
    literal: jest.fn(val => val),
    col: jest.fn(val => val)
};

// Model Mocks
const mockPenugasan = {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findByPk: jest.fn(),
};

const mockSlotAgendaStaff = {
    findAll: jest.fn(),
    bulkCreate: jest.fn(),
};

const mockAgendaPimpinan = {
    findOne: jest.fn(),
};

const mockAgenda = {
    findAll: jest.fn(),
    findByPk: jest.fn(),
};

const mockUser = {
    findAll: jest.fn(),
};

const mockStatusAgenda = {
    findOne: jest.fn(),
    create: jest.fn(),
};

const mockSlotWaktu = {
    findAll: jest.fn(),
};

jest.mock('../../../models', () => {
    return {
        Penugasan: mockPenugasan,
        SlotAgendaStaff: mockSlotAgendaStaff,
        SlotAgendaPimpinan: {},
        AgendaPimpinan: mockAgendaPimpinan,
        User: mockUser,
        Role: {},
        Agenda: mockAgenda,
        StatusAgenda: mockStatusAgenda,
        SlotWaktu: mockSlotWaktu,
        PeriodeJabatan: {},
        Pimpinan: {},
        Periode: {},
        JabatanPimpinan: {},
        LaporanKegiatan: {},
        DraftBerita: {},
        DokumentasiBerita: {},
        RevisiDraftBerita: {},
        KASKPDPendamping: {},
        KASKPD: {},
        sequelize: mockSequelizeObj
    };
});

jest.mock('../../../helpers/pushNotificationHelper', () => ({
    sendPushNotification: jest.fn().mockResolvedValue(null),
}));

const PenugasanController = require('../../../controllers/PenugasanController');
const { sendPushNotification } = require('../../../helpers/pushNotificationHelper');

describe('PenugasanController Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            query: {},
            user: { id_user: 'USR001', nama_role: 'Kasubag Protokol' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
        // Reset manual mocks
        mockTransactionObj.commit.mockResolvedValue(null);
        mockTransactionObj.rollback.mockResolvedValue(null);
        mockSequelizeObj.transaction.mockResolvedValue(mockTransactionObj);
    });

    describe('1. generatePenugasanId()', () => {
        test('1. Return "PN001" jika tidak ada data', async () => {
            mockPenugasan.findOne.mockResolvedValue(null);
            const id = await PenugasanController.generatePenugasanId();
            expect(id).toBe('PN001');
        });

        test('2. Return increment (PN005 → PN006)', async () => {
            mockPenugasan.findOne.mockResolvedValue({ id_penugasan: 'PN005' });
            const id = await PenugasanController.generatePenugasanId();
            expect(id).toBe('PN006');
        });

        test('3. Handle error database', async () => {
            mockPenugasan.findOne.mockRejectedValue(new Error('DB Error'));
            await expect(PenugasanController.generatePenugasanId()).rejects.toThrow('DB Error');
        });

        test('4. Prefix tidak diawali PN → start from PN001', async () => {
            mockPenugasan.findOne.mockResolvedValue({ id_penugasan: 'XX999' });
            const id = await PenugasanController.generatePenugasanId();
            expect(id).toBe('PN001');
        });

        test('5. Suffix bukan angka → start from PN001', async () => {
            mockPenugasan.findOne.mockResolvedValue({ id_penugasan: 'PNabc' });
            const id = await PenugasanController.generatePenugasanId();
            expect(id).toBe('PN001');
        });

        test('6. generateStatusAgendaId: Suffix bukan angka → start from SA001', async () => {
            mockStatusAgenda.findOne.mockResolvedValue({ id_status_agenda: 'SAabc' });
            const id = await PenugasanController.generateStatusAgendaId();
            expect(id).toBe('SA001');
        });

        test('7. generateStatusAgendaId: Return increment (SA001 → SA002)', async () => {
            mockStatusAgenda.findOne.mockResolvedValue({ id_status_agenda: 'SA001' });
            const id = await PenugasanController.generateStatusAgendaId();
            expect(id).toBe('SA002');
        });
    });

    describe('2. getStaffProtokol() & getStaffMedia()', () => {
        let responseSpy, errorSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(PenugasanController, 'sendResponse');
            errorSpy = jest.spyOn(PenugasanController, 'sendError');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('1. getStaffProtokol: Return 200 dan data', async () => {
            const mockStaff = [{ id_user: 'U1', nama: 'Staff P' }];
            mockUser.findAll.mockResolvedValue(mockStaff);
            await PenugasanController.getStaffProtokol(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(responseSpy).toHaveBeenCalledWith(res, 200, true, expect.any(String), mockStaff);
        });

        test('2. getStaffProtokol: Return error jika gagal', async () => {
            const error = new Error('Fetch P Fail');
            mockUser.findAll.mockRejectedValue(error);
            await PenugasanController.getStaffProtokol(req, res);
            expect(errorSpy).toHaveBeenCalledWith(res, error, expect.any(String));
        });

        test('3. getStaffMedia: Return 200 dan data', async () => {
            const mockStaff = [{ id_user: 'U2', nama: 'Staff M' }];
            mockUser.findAll.mockResolvedValue(mockStaff);
            await PenugasanController.getStaffMedia(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(responseSpy).toHaveBeenCalledWith(res, 200, true, expect.any(String), mockStaff);
        });

        test('4. getStaffMedia: Return error jika gagal', async () => {
            const error = new Error('Fetch M Fail');
            mockUser.findAll.mockRejectedValue(error);
            await PenugasanController.getStaffMedia(req, res);
            expect(errorSpy).toHaveBeenCalledWith(res, error, expect.any(String));
        });
    });

    describe('3. getAgendasForAssignment() & getAgendasForMediaAssignment()', () => {
        let responseSpy, errorSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(PenugasanController, 'sendResponse');
            errorSpy = jest.spyOn(PenugasanController, 'sendError');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('1. getAgendasForAssignment: Return 200 jika sukses', async () => {
            const mockAgendas = [
                { 
                    id_agenda: 'A1', 
                    nama_kegiatan: 'K1',
                    toJSON: () => ({
                        id_agenda: 'A1',
                        nama_kegiatan: 'K1',
                        agendaPimpinans: [{
                            status_kehadiran: 'hadir',
                            periodeJabatan: { pimpinan: { nama_pimpinan: 'L1' } }
                        }]
                    })
                }
            ];
            mockAgenda.findAll.mockResolvedValue(mockAgendas);
            await PenugasanController.getAgendasForAssignment(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(responseSpy).toHaveBeenCalledWith(res, 200, true, expect.any(String), expect.any(Array));
            
            const result = responseSpy.mock.calls[0][4];
            expect(result[0].pimpinans[0].nama_pimpinan).toBe('L1');
        });

        test('2. getAgendasForAssignment: Return error jika database gagal', async () => {
            const error = new Error('Agenda DB Error');
            mockAgenda.findAll.mockRejectedValue(error);
            await PenugasanController.getAgendasForAssignment(req, res);
            expect(errorSpy).toHaveBeenCalledWith(res, error, expect.any(String));
        });

        test('3. getAgendasForMediaAssignment: Return 200 jika sukses', async () => {
            const mockAgendas = [
                { 
                    id_agenda: 'A2', 
                    nama_kegiatan: 'Media K',
                    toJSON: () => ({
                        id_agenda: 'A2',
                        nama_kegiatan: 'Media K',
                        agendaPimpinans: [{
                            status_kehadiran: 'diwakilkan',
                            nama_perwakilan: 'Wakil 1',
                            periodeJabatan: { pimpinan: { nama_pimpinan: 'L2' } }
                        }]
                    })
                }
            ];
            mockAgenda.findAll.mockResolvedValue(mockAgendas);
            await PenugasanController.getAgendasForMediaAssignment(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(responseSpy).toHaveBeenCalledWith(res, 200, true, expect.any(String), expect.any(Array));

            const result = responseSpy.mock.calls[0][4];
            expect(result[0].pimpinans[0].is_representative).toBe(true);
        });

        test('4. getAgendasForMediaAssignment: Return error jika database gagal', async () => {
            const error = new Error('Media Agenda DB Error');
            mockAgenda.findAll.mockRejectedValue(error);
            await PenugasanController.getAgendasForMediaAssignment(req, res);
            expect(errorSpy).toHaveBeenCalledWith(res, error, expect.any(String));
        });
    });

    describe('4. assignStaff()', () => {
        let responseSpy, errorSpy, generateSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(PenugasanController, 'sendResponse');
            errorSpy = jest.spyOn(PenugasanController, 'sendError');
            generateSpy = jest.spyOn(PenugasanController, 'generatePenugasanId').mockResolvedValue('PN001');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
            generateSpy.mockRestore();
        });

        test('1. id_agenda kosong → 400', async () => {
            req.body = { staff_ids: ['U1'] };
            await PenugasanController.assignStaff(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(mockTransactionObj.rollback).toHaveBeenCalled();
        });

        test('2. staff_ids kosong → 400', async () => {
            req.body = { id_agenda: 'A1', staff_ids: [] };
            await PenugasanController.assignStaff(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(mockTransactionObj.rollback).toHaveBeenCalled();
        });

        test('3. Agenda tidak ditemukan → 404', async () => {
            req.body = { id_agenda: 'A1', staff_ids: ['U1'] };
            mockAgendaPimpinan.findOne.mockResolvedValue({ id_agenda: 'A1' });
            mockAgenda.findByPk.mockResolvedValue(null);

            await PenugasanController.assignStaff(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(mockTransactionObj.rollback).toHaveBeenCalled();
        });

        test('4. Tidak ada pimpinan hadir → 404', async () => {
            req.body = { id_agenda: 'A1', staff_ids: ['U1'] };
            mockAgendaPimpinan.findOne.mockResolvedValue(null);

            await PenugasanController.assignStaff(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(mockTransactionObj.rollback).toHaveBeenCalled();
        });

        test('5. Conflict staff (jadwal bentrok) → 409', async () => {
            req.body = { id_agenda: 'A1', staff_ids: ['U1'] };
            mockAgendaPimpinan.findOne.mockResolvedValue({ id_agenda: 'A1' });
            mockAgenda.findByPk.mockResolvedValue({ id_agenda: 'A1', waktu_mulai: '10:00', waktu_selesai: '12:00' });
            mockSlotWaktu.findAll.mockResolvedValue([{ id_slot_waktu: 'S1' }]);
            
            mockSlotAgendaStaff.findAll.mockResolvedValue([{ 
                id_user_staff: 'U1', 
                staff: { nama: 'Staf Bentrok' },
                penugasan: { agenda: { nama_kegiatan: 'Agenda Lain' } }
            }]);

            await PenugasanController.assignStaff(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(mockTransactionObj.rollback).toHaveBeenCalled();
        });

        test('5.5 Multiple conflicts for same staff → hit the "false" branch in grouping', async () => {
            req.body = { id_agenda: 'A1', staff_ids: ['U1'] };
            mockAgendaPimpinan.findOne.mockResolvedValue({ id_agenda: 'A1' });
            mockAgenda.findByPk.mockResolvedValue({ id_agenda: 'A1', waktu_mulai: '10:00', waktu_selesai: '12:00' });
            mockSlotWaktu.findAll.mockResolvedValue([{ id_slot_waktu: 'S1' }, { id_slot_waktu: 'S2' }]);
            
            mockSlotAgendaStaff.findAll.mockResolvedValue([
                { id_user_staff: 'U1', staff: { nama: 'S1' }, penugasan: { agenda: { nama_kegiatan: 'A1' } } },
                { id_user_staff: 'U1', staff: { nama: 'S1' }, penugasan: { agenda: { nama_kegiatan: 'A2' } } }
            ]);

            await PenugasanController.assignStaff(req, res);
            expect(res.status).toHaveBeenCalledWith(409);
        });

        test('6. Sukses assign', async () => {
            req.body = { id_agenda: 'A1', staff_ids: ['U1'] };
            mockAgendaPimpinan.findOne.mockResolvedValue({ id_agenda: 'A1' });
            mockAgenda.findByPk.mockResolvedValue({ id_agenda: 'A1', nama_kegiatan: 'K1', waktu_mulai: '10:00', waktu_selesai: '12:00', tanggal_kegiatan: '2024-01-01' });
            mockSlotWaktu.findAll.mockResolvedValue([{ id_slot_waktu: 'S1' }]);
            mockSlotAgendaStaff.findAll.mockResolvedValue([]);
            
            mockPenugasan.create.mockResolvedValue({ id_penugasan: 'PN001' });

            await PenugasanController.assignStaff(req, res);

            expect(mockPenugasan.create).toHaveBeenCalled();
            expect(mockTransactionObj.commit).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('6.5 Sukses assign with provided jenis_penugasan in body', async () => {
            req.body = { id_agenda: 'A1', staff_ids: ['U1'], jenis_penugasan: 'tugas_khusus' };
            mockAgendaPimpinan.findOne.mockResolvedValue({ id_agenda: 'A1' });
            mockAgenda.findByPk.mockResolvedValue({ id_agenda: 'A1', tanggal_kegiatan: '2024-01-01' });
            mockSlotWaktu.findAll.mockResolvedValue([]); 
            mockPenugasan.create.mockResolvedValue({ id_penugasan: 'PN001' });

            await PenugasanController.assignStaff(req, res);

            expect(mockPenugasan.create).toHaveBeenCalledWith(expect.objectContaining({
                jenis_penugasan: 'tugas_khusus'
            }), expect.any(Object));
        });

        test('7. Success with auto jenis_penugasan from role (Kasubag Media)', async () => {
            req.user.nama_role = 'Kasubag Media';
            req.body = { id_agenda: 'A1', staff_ids: ['U1'] };
            mockAgendaPimpinan.findOne.mockResolvedValue({ id_agenda: 'A1' });
            mockAgenda.findByPk.mockResolvedValue({ id_agenda: 'A1', tanggal_kegiatan: '2024-01-01' });
            mockSlotWaktu.findAll.mockResolvedValue([]); 
            mockPenugasan.create.mockResolvedValue({ id_penugasan: 'PN001' });

            await PenugasanController.assignStaff(req, res);

            expect(mockPenugasan.create).toHaveBeenCalledWith(expect.objectContaining({
                jenis_penugasan: 'media'
            }), expect.any(Object));
        });

        test('8. Error handling & rollback called', async () => {
            req.body = { id_agenda: 'A1', staff_ids: ['U1'] };
            mockAgendaPimpinan.findOne.mockRejectedValue(new Error('Fatal Error'));

            await PenugasanController.assignStaff(req, res);

            expect(mockTransactionObj.rollback).toHaveBeenCalled();
            expect(errorSpy).toHaveBeenCalled();
        });

        test('8.5 Error handling when transaction is null (Branch 337 coverage)', async () => {
            mockSequelizeObj.transaction.mockResolvedValue(null);
            req.body = { id_agenda: 'A1', staff_ids: ['U1'] };
            await PenugasanController.assignStaff(req, res);
            expect(errorSpy).toHaveBeenCalled();
        });

        test('9. Default jenis_penugasan to "protokol" for other roles', async () => {
            req.user.nama_role = 'Other Role';
            req.body = { id_agenda: 'A1', staff_ids: ['U1'] };
            mockAgendaPimpinan.findOne.mockResolvedValue({ id_agenda: 'A1' });
            mockAgenda.findByPk.mockResolvedValue({ id_agenda: 'A1', tanggal_kegiatan: '2024-01-01' });
            mockSlotWaktu.findAll.mockResolvedValue([]); 
            mockPenugasan.create.mockResolvedValue({ id_penugasan: 'PN001' });

            await PenugasanController.assignStaff(req, res);

            expect(mockPenugasan.create).toHaveBeenCalledWith(expect.objectContaining({
                jenis_penugasan: 'protokol'
            }), expect.any(Object));
        });

        test('10. Kasubag Protokol → jenis_penugasan="protokol"', async () => {
            req.user.nama_role = 'Kasubag Protokol';
            req.body = { id_agenda: 'A1', staff_ids: ['U1'] };
            mockAgendaPimpinan.findOne.mockResolvedValue({ id_agenda: 'A1' });
            mockAgenda.findByPk.mockResolvedValue({ id_agenda: 'A1', tanggal_kegiatan: '2024-01-01' });
            mockSlotWaktu.findAll.mockResolvedValue([]); 
            mockPenugasan.create.mockResolvedValue({ id_penugasan: 'PN001' });

            await PenugasanController.assignStaff(req, res);

            expect(mockPenugasan.create).toHaveBeenCalledWith(expect.objectContaining({
                jenis_penugasan: 'protokol'
            }), expect.any(Object));
        });

        test('11. Conflict check: fallback ke ID jika nama staff null', async () => {
            req.body = { id_agenda: 'A1', staff_ids: ['U1'] };
            mockAgendaPimpinan.findOne.mockResolvedValue({ id_agenda: 'A1' });
            mockAgenda.findByPk.mockResolvedValue({ id_agenda: 'A1', waktu_mulai: '10:00', waktu_selesai: '12:00' });
            mockSlotWaktu.findAll.mockResolvedValue([{ id_slot_waktu: 'S1' }]);
            
            mockSlotAgendaStaff.findAll.mockResolvedValue([{ 
                id_user_staff: 'U1', 
                staff: null, // Test fallback
                penugasan: { agenda: null } // Test fallback
            }]);

            await PenugasanController.assignStaff(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(responseSpy.mock.calls[0][3]).toContain('U1');
        });

        test('12. No overlapping slots → skip bulkCreate', async () => {
            req.body = { id_agenda: 'A1', staff_ids: ['U1'] };
            mockAgendaPimpinan.findOne.mockResolvedValue({ id_agenda: 'A1' });
            mockAgenda.findByPk.mockResolvedValue({ id_agenda: 'A1', tanggal_kegiatan: '2024-01-01' });
            mockSlotWaktu.findAll.mockResolvedValue([]); 

            await PenugasanController.assignStaff(req, res);

            expect(mockSlotAgendaStaff.bulkCreate).not.toHaveBeenCalled();
            expect(mockTransactionObj.commit).toHaveBeenCalled();
        });
    });

    describe('5. getMyPenugasan()', () => {
        let responseSpy, errorSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(PenugasanController, 'sendResponse');
            errorSpy = jest.spyOn(PenugasanController, 'sendError');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('1. Role staff → filter berdasarkan SlotAgendaStaff', async () => {
            req.user.nama_role = 'Staff Protokol';
            mockSlotAgendaStaff.findAll.mockResolvedValue([{ id_penugasan: 'PN001' }]);
            mockPenugasan.findAll.mockResolvedValue([]);

            await PenugasanController.getMyPenugasan(req, res);

            expect(mockSlotAgendaStaff.findAll).toHaveBeenCalledWith(expect.objectContaining({
                where: { id_user_staff: req.user.id_user }
            }));
        });

        test('2. Role kasubag → filter berdasarkan id_user_kasubag', async () => {
            req.user.nama_role = 'Kasubag Protokol';
            mockPenugasan.findAll.mockResolvedValue([]);

            await PenugasanController.getMyPenugasan(req, res);

            expect(mockPenugasan.findAll).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ id_user_kasubag: req.user.id_user })
            }));
        });

        test('3. Success with all status mappings (Progress, Selesai, Belum Dimulai)', async () => {
            req.user.nama_role = 'Kasubag Protokol';
            const mockP1 = {
                status: 'progress',
                toJSON: () => ({ status: 'progress', slotAgendaStaffs: [{ staff: { id_user: 'U1', nama: 'S1' } }] })
            };
            const mockP2 = {
                status: 'selesai',
                toJSON: () => ({ status: 'selesai', slotAgendaStaffs: [] })
            };
            const mockP3 = {
                status: 'pending',
                toJSON: () => ({ status: 'pending', slotAgendaStaffs: [] })
            };
            mockPenugasan.findAll.mockResolvedValue([mockP1, mockP2, mockP3]);

            await PenugasanController.getMyPenugasan(req, res);

            const result = responseSpy.mock.calls[0][4];
            expect(result[0].status_pelaksanaan).toBe('Berlangsung');
            expect(result[1].status_pelaksanaan).toBe('Selesai');
            expect(result[2].status_pelaksanaan).toBe('Belum Dimulai');
            expect(result[0].nama_staf).toContain('S1');
        });

        test('4. Role Kasubag Media: filter jenis_penugasan="media"', async () => {
            req.user.nama_role = 'Kasubag Media';
            mockPenugasan.findAll.mockResolvedValue([]);
            await PenugasanController.getMyPenugasan(req, res);
            expect(mockPenugasan.findAll).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ jenis_penugasan: 'media' })
            }));
        });

        test('5. Data mapping: Pimpinan names and staff names', async () => {
            req.user.nama_role = 'Kasubag Protokol';
            const mockP = {
                toJSON: () => ({
                    status: 'pending',
                    agenda: {
                        agendaPimpinans: [{
                            periodeJabatan: { pimpinan: { nama_pimpinan: 'L1' }, jabatan: { nama_jabatan: 'J1' } }
                        }]
                    },
                    slotAgendaStaffs: [{ staff: { id_user: 'U1', nama: 'S1' } }]
                })
            };
            mockPenugasan.findAll.mockResolvedValue([mockP]);

            await PenugasanController.getMyPenugasan(req, res);

            const result = responseSpy.mock.calls[0][4];
            expect(result[0].nama_staf).toEqual(['S1']);
            expect(result[0].pimpinans[0].nama_pimpinan).toBe('L1');
        });

        test('6. Pimpinan mapping fallbacks (|| "-")', async () => {
            req.user.nama_role = 'Kasubag Protokol';
            const mockP = {
                toJSON: () => ({
                    status: 'pending',
                    agenda: {
                        agendaPimpinans: [{
                            periodeJabatan: null // Trigger optional chaining fallbacks
                        }]
                    },
                    slotAgendaStaffs: [{ staff: null }] // Trigger staff fallback
                })
            };
            mockPenugasan.findAll.mockResolvedValue([mockP]);

            await PenugasanController.getMyPenugasan(req, res);

            const result = responseSpy.mock.calls[0][4];
            expect(result[0].pimpinans[0].nama_pimpinan).toBe('-');
            expect(result[0].nama_staf).toEqual([]);
        });

        test('7. handle null slotAgendaStaffs', async () => {
            const mockP = {
                toJSON: () => ({ status: 'pending', slotAgendaStaffs: null })
            };
            mockPenugasan.findAll.mockResolvedValue([mockP]);
            await PenugasanController.getMyPenugasan(req, res);
            expect(responseSpy).toHaveBeenCalledWith(res, 200, true, expect.any(String), expect.any(Array));
        });

        test('8. Error handling', async () => {
            mockPenugasan.findAll.mockRejectedValue(new Error('Fail'));
            await PenugasanController.getMyPenugasan(req, res);
            expect(errorSpy).toHaveBeenCalled();
        });
    });

    describe('6. getPenugasanDetail()', () => {
        let responseSpy, errorSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(PenugasanController, 'sendResponse');
            errorSpy = jest.spyOn(PenugasanController, 'sendError');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('1. Return 404 jika tidak ditemukan', async () => {
            req.params = { id: 'PN999' };
            mockPenugasan.findOne.mockResolvedValue(null);

            await PenugasanController.getPenugasanDetail(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('2. Return 403 jika tidak punya akses (Staff not assigned)', async () => {
            req.params = { id: 'PN001' };
            req.user.nama_role = 'Staff Protokol';
            req.user.id_user = 'U_OTHER';
            const mockP = {
                id_user_kasubag: 'K1',
                slotAgendaStaffs: [{ id_user_staff: 'U_ASSIGNED' }],
                toJSON: () => ({ id_user_kasubag: 'K1', slotAgendaStaffs: [{ id_user_staff: 'U_ASSIGNED' }] })
            };
            mockPenugasan.findOne.mockResolvedValue(mockP);

            await PenugasanController.getPenugasanDetail(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('3. Return 403 jika tidak punya akses (Kasubag not owner)', async () => {
            req.params = { id: 'PN001' };
            req.user.nama_role = 'Kasubag Protokol';
            req.user.id_user = 'K_OTHER';
            const mockP = {
                id_user_kasubag: 'K_OWNER',
                jenis_penugasan: 'protokol',
                toJSON: () => ({ id_user_kasubag: 'K_OWNER', jenis_penugasan: 'protokol' })
            };
            mockPenugasan.findOne.mockResolvedValue(mockP);

            await PenugasanController.getPenugasanDetail(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('4. Return 200 jika sukses (Admin/Monitoring access)', async () => {
            req.params = { id: 'PN001' };
            req.user.nama_role = 'Admin';
            const mockP = {
                id_user_kasubag: 'K1',
                jenis_penugasan: 'protokol',
                toJSON: () => ({ id_user_kasubag: 'K1', jenis_penugasan: 'protokol', slotAgendaStaffs: [] })
            };
            mockPenugasan.findOne.mockResolvedValue(mockP);

            await PenugasanController.getPenugasanDetail(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('5. Success 200 with status mappings (Selesai, Pending, Progress)', async () => {
            req.params = { id: 'PN001' };
            req.user.nama_role = 'Kasubag Protokol';
            req.user.id_user = 'K1';
            const mockP1 = {
                status: 'selesai',
                id_user_kasubag: 'K1',
                toJSON: () => ({ status: 'selesai', id_user_kasubag: 'K1', slotAgendaStaffs: [{ staff: { id_user: 'U1', nama: 'S1' } }] })
            };
            mockPenugasan.findOne.mockResolvedValue(mockP1);

            await PenugasanController.getPenugasanDetail(req, res);
            expect(responseSpy.mock.calls[0][4].status_pelaksanaan).toBe('Selesai');

            // Test with progress
            const mockPprogress = {
                status: 'progress',
                id_user_kasubag: 'K1',
                toJSON: () => ({ status: 'progress', id_user_kasubag: 'K1', slotAgendaStaffs: [] })
            };
            mockPenugasan.findOne.mockResolvedValue(mockPprogress);
            await PenugasanController.getPenugasanDetail(req, res);
            expect(responseSpy.mock.calls[1][4].status_pelaksanaan).toBe('Berlangsung');

            // Test with pending
            const mockP2 = {
                status: 'pending',
                id_user_kasubag: 'K1',
                toJSON: () => ({ status: 'pending', id_user_kasubag: 'K1', slotAgendaStaffs: [] })
            };
            mockPenugasan.findOne.mockResolvedValue(mockP2);
            await PenugasanController.getPenugasanDetail(req, res);
            expect(responseSpy.mock.calls[2][4].status_pelaksanaan).toBe('Belum Dimulai');
        });

        test('6. Mapping detail fallbacks (|| "-")', async () => {
            req.params = { id: 'PN001' };
            req.user.nama_role = 'Admin';
            const mockP = {
                id_user_kasubag: 'USR001', // Authorized owner
                jenis_penugasan: 'protokol',
                toJSON: () => ({
                    id_user_kasubag: 'USR001',
                    status: 'other',
                    agenda: { agendaPimpinans: [{ periodeJabatan: {} }] },
                    slotAgendaStaffs: []
                })
            };
            mockPenugasan.findOne.mockResolvedValue(mockP);
            await PenugasanController.getPenugasanDetail(req, res);
            const result = responseSpy.mock.calls[0][4];
            expect(result.status_pelaksanaan).toBe('Belum Dimulai');
            expect(result.pimpinans[0].nama_pimpinan).toBe('-');
        });

        test('7. Return 403 for monitoring role but unauthorized assignment type', async () => {
            req.params = { id: 'PN001' };
            req.user.nama_role = 'Sespri';
            req.user.id_user = 'S1';
            const mockP = {
                id_user_kasubag: 'OTHER',
                jenis_penugasan: 'media',
                toJSON: () => ({ id_user_kasubag: 'OTHER', jenis_penugasan: 'media' })
            };
            mockPenugasan.findOne.mockResolvedValue(mockP);

            await PenugasanController.getPenugasanDetail(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('8. Error path fetch fail → 500', async () => {
            req.params = { id: 'PN001' };
            mockPenugasan.findOne.mockRejectedValue(new Error('Detail Fail'));
            await PenugasanController.getPenugasanDetail(req, res);
            expect(errorSpy).toHaveBeenCalled();
        });
    });

    describe('7. updateStatusPenugasan()', () => {
        let responseSpy, errorSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(PenugasanController, 'sendResponse');
            errorSpy = jest.spyOn(PenugasanController, 'sendError');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('1. Status tidak valid → 400', async () => {
            req.params = { id: 'PN1' };
            req.body = { status: 'invalid' };
            await PenugasanController.updateStatusPenugasan(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(mockTransactionObj.rollback).toHaveBeenCalled();
        });

        test('2. Penugasan tidak ditemukan → 404', async () => {
            req.params = { id: 'PN1' };
            req.body = { status: 'progress' };
            mockPenugasan.findOne.mockResolvedValue(null);

            await PenugasanController.updateStatusPenugasan(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(mockTransactionObj.rollback).toHaveBeenCalled();
        });

        test('3. Update sukses → 200', async () => {
            req.params = { id: 'PN1' };
            req.body = { status: 'progress' };
            const mockPInstance = { id_penugasan: 'PN1', update: jest.fn().mockResolvedValue(null) };
            mockPenugasan.findOne.mockResolvedValue(mockPInstance);
            
            await PenugasanController.updateStatusPenugasan(req, res);

            expect(mockPInstance.update).toHaveBeenCalled();
            expect(mockTransactionObj.commit).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(responseSpy.mock.calls[0][3]).toContain('Berlangsung');
        });

        test('4. Update sukses ke selesai → label "Selesai"', async () => {
            req.params = { id: 'PN1' };
            req.body = { status: 'selesai' };
            const mockPInstance = { id_penugasan: 'PN1', id_agenda: 'A1', update: jest.fn().mockResolvedValue(null) };
            mockPenugasan.findOne.mockResolvedValue(mockPInstance);
            mockStatusAgenda.findOne.mockResolvedValue(null);

            await PenugasanController.updateStatusPenugasan(req, res);
            expect(responseSpy.mock.calls[0][3]).toContain('Selesai');
        });

        test('5. Update sukses ke pending → label "Belum Dimulai"', async () => {
            req.params = { id: 'PN1' };
            req.body = { status: 'pending' };
            const mockPInstance = { id_penugasan: 'PN1', update: jest.fn().mockResolvedValue(null) };
            mockPenugasan.findOne.mockResolvedValue(mockPInstance);

            await PenugasanController.updateStatusPenugasan(req, res);
            expect(responseSpy.mock.calls[0][3]).toContain('Belum Dimulai');
        });

        test('6. Jika status = selesai: StatusAgenda.create dipanggil', async () => {
            req.params = { id: 'PN1' };
            req.body = { status: 'selesai' };
            const mockPInstance = { id_penugasan: 'PN1', id_agenda: 'A1', update: jest.fn().mockResolvedValue(null) };
            mockPenugasan.findOne.mockResolvedValue(mockPInstance);
            mockStatusAgenda.findOne.mockResolvedValue(null);

            await PenugasanController.updateStatusPenugasan(req, res);

            expect(mockStatusAgenda.create).toHaveBeenCalled();
            expect(mockTransactionObj.commit).toHaveBeenCalled();
        });

        test('5. Error → rollback', async () => {
            req.params = { id: 'PN1' };
            req.body = { status: 'progress' };
            mockPenugasan.findOne.mockRejectedValue(new Error('Fatal'));

            await PenugasanController.updateStatusPenugasan(req, res);
            expect(mockTransactionObj.rollback).toHaveBeenCalled();
            expect(errorSpy).toHaveBeenCalled();
        });
    });

    describe('8. getProtokolAssignments()', () => {
        let responseSpy, errorSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(PenugasanController, 'sendResponse');
            errorSpy = jest.spyOn(PenugasanController, 'sendError');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('1. Return 200 with data mapping (pimpinans, staff)', async () => {
            const mockData = {
                status: 'progress',
                toJSON: () => ({
                    status: 'progress',
                    slotAgendaStaffs: [{ staff: { id_user: 'U1', nama: 'S1' } }],
                    agenda: {
                        agendaPimpinans: [{
                            periodeJabatan: { pimpinan: { nama_pimpinan: 'L1' }, jabatan: { nama_jabatan: 'J1' } }
                        }]
                    }
                })
            };
            mockPenugasan.findAll.mockResolvedValue([mockData]);
            await PenugasanController.getProtokolAssignments(req, res);
            
            expect(res.status).toHaveBeenCalledWith(200);
            const result = responseSpy.mock.calls[0][4];
            expect(result[0].status_pelaksanaan).toBe('Berlangsung');
            expect(result[0].nama_staf).toEqual(['S1']);
            expect(result[0].pimpinans[0].nama_pimpinan).toBe('L1');
        });

        test('2. Mapping fallbacks for protokol (status, staff, pimpinan)', async () => {
            const mockData = {
                status: 'selesai',
                toJSON: () => ({
                    status: 'selesai',
                    slotAgendaStaffs: [{ staff: null }],
                    agenda: { agendaPimpinans: [{ periodeJabatan: null }] }
                })
            };
            mockPenugasan.findAll.mockResolvedValue([mockData]);
            await PenugasanController.getProtokolAssignments(req, res);
            const result = responseSpy.mock.calls[0][4];
            expect(result[0].status_pelaksanaan).toBe('Selesai');
            expect(result[0].nama_staf).toEqual([]);
            expect(result[0].pimpinans[0].nama_pimpinan).toBe('-');
        });

        test('2.5 Mapping with progress status for protokol', async () => {
            const mockData = {
                status: 'progress',
                toJSON: () => ({ status: 'progress', slotAgendaStaffs: [] })
            };
            mockPenugasan.findAll.mockResolvedValue([mockData]);
            await PenugasanController.getProtokolAssignments(req, res);
            const result = responseSpy.mock.calls[0][4];
            expect(result[0].status_pelaksanaan).toBe('Berlangsung');
        });

        test('2.6 Mapping with pending status for protokol', async () => {
            const mockData = {
                status: 'pending',
                toJSON: () => ({ status: 'pending', slotAgendaStaffs: [] })
            };
            mockPenugasan.findAll.mockResolvedValue([mockData]);
            await PenugasanController.getProtokolAssignments(req, res);
            const result = responseSpy.mock.calls[0][4];
            expect(result[0].status_pelaksanaan).toBe('Belum Dimulai');
        });

        test('3. Return error on failure', async () => {
            mockPenugasan.findAll.mockRejectedValue(new Error('List Fail'));
            await PenugasanController.getProtokolAssignments(req, res);
            expect(errorSpy).toHaveBeenCalled();
        });
    });
});
