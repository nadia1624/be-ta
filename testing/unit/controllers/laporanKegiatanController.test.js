const fs = require('fs');
const path = require('path');

// Hoisted mock variables
const mockTransactionObj = {
    commit: jest.fn().mockResolvedValue(null),
    rollback: jest.fn().mockResolvedValue(null),
};

const mockSequelizeObj = {
    transaction: jest.fn(() => Promise.resolve(mockTransactionObj)),
    literal: jest.fn(v => v),
    col: jest.fn(v => v)
};

const mockLaporanKegiatan = {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
};

const mockPenugasan = {
    findOne: jest.fn(),
    update: jest.fn(),
};

const mockSlotAgendaStaff = {
    findOne: jest.fn(),
};

jest.mock('../../../models', () => {
    return {
        LaporanKegiatan: mockLaporanKegiatan,
        Penugasan: mockPenugasan,
        SlotAgendaStaff: mockSlotAgendaStaff,
        Agenda: {},
        User: { attributes: ['id_user', 'nama'] },
        SlotWaktu: {},
        sequelize: mockSequelizeObj,
        // Other models to avoid destructuring errors
        SlotAgendaPimpinan: {}, PeriodeJabatan: {}, Role: {}, Pimpinan: {}, Periode: {}, JabatanPimpinan: {}, DraftBerita: {}, DokumentasiBerita: {}, RevisiDraftBerita: {}, KASKPDPendamping: {}, KASKPD: {}
    };
});

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    unlinkSync: jest.fn(),
}));

const LaporanKegiatanController = require('../../../controllers/laporanKegiatanController');

describe('LaporanKegiatanController Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            user: { id_user: 'USR001', nama_role: 'Staff Protokol' },
            file: null
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
        // Reset default mock behaviors
        mockSequelizeObj.transaction.mockResolvedValue(mockTransactionObj);
        mockTransactionObj.commit.mockResolvedValue(null);
        mockTransactionObj.rollback.mockResolvedValue(null);
    });

    describe('1. generateLaporanId()', () => {
        test('1. Return "LK001" jika tidak ada data', async () => {
            mockLaporanKegiatan.findOne.mockResolvedValue(null);
            const id = await LaporanKegiatanController.generateLaporanId();
            expect(id).toBe('LK001');
        });

        test('2. Return increment ID jika ada data (LK005 → LK006)', async () => {
            mockLaporanKegiatan.findOne.mockResolvedValue({ id_laporan: 'LK005' });
            const id = await LaporanKegiatanController.generateLaporanId();
            expect(id).toBe('LK006');
        });

        test('3. Handle error jika findOne gagal', async () => {
            mockLaporanKegiatan.findOne.mockRejectedValue(new Error('DB Error'));
            await expect(LaporanKegiatanController.generateLaporanId()).rejects.toThrow('DB Error');
        });
    });

    describe('2. addLaporan()', () => {
        let responseSpy, errorSpy, idSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(LaporanKegiatanController, 'sendResponse');
            errorSpy = jest.spyOn(LaporanKegiatanController, 'sendError');
            idSpy = jest.spyOn(LaporanKegiatanController, 'generateLaporanId').mockResolvedValue('LK001');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
            idSpy.mockRestore();
        });

        test('1. Return 403 jika bukan Staff Protokol', async () => {
            req.user.nama_role = 'Admin';
            await LaporanKegiatanController.addLaporan(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(mockTransactionObj.rollback).toHaveBeenCalled();
        });

        test('2. Return 400 jika id_penugasan kosong', async () => {
            req.body = { deskripsi_laporan: 'D1' };
            await LaporanKegiatanController.addLaporan(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(mockTransactionObj.rollback).toHaveBeenCalled();
        });

        test('3. Return 400 jika deskripsi_laporan kosong', async () => {
            req.body = { id_penugasan: 'PN1' };
            await LaporanKegiatanController.addLaporan(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(mockTransactionObj.rollback).toHaveBeenCalled();
        });

        test('4. Return 404 jika penugasan tidak ditemukan / no access', async () => {
            req.body = { id_penugasan: 'PN1', deskripsi_laporan: 'D1' };
            mockPenugasan.findOne.mockResolvedValue(null);

            await LaporanKegiatanController.addLaporan(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(mockTransactionObj.rollback).toHaveBeenCalled();
        });

        test('5. Return 403 jika hari ini < tanggal agenda', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 5); // Menggunakan 5 hari ke depan agar kebal terhadap zona waktu
            const agendaDate = futureDate.toISOString().split('T')[0];

            req.body = { id_penugasan: 'PN1', deskripsi_laporan: 'D1' };
            mockPenugasan.findOne.mockResolvedValue({ 
                id_penugasan: 'PN1', 
                agenda: { tanggal_kegiatan: agendaDate } 
            });

            await LaporanKegiatanController.addLaporan(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(mockTransactionObj.rollback).toHaveBeenCalled();
        });

        test('6. Create laporan tanpa file (dokumentasi null)', async () => {
            const today = new Date().toISOString().split('T')[0];
            req.body = { id_penugasan: 'PN1', deskripsi_laporan: 'Test Desc' };
            
            const mockPenugasanInstance = { 
                id_penugasan: 'PN1', 
                status: 'pending',
                agenda: { tanggal_kegiatan: today },
                update: jest.fn().mockResolvedValue(true)
            };
            mockPenugasan.findOne.mockResolvedValue(mockPenugasanInstance);
            mockLaporanKegiatan.create.mockResolvedValue({ id_laporan: 'LK001' });

            await LaporanKegiatanController.addLaporan(req, res);

            expect(mockLaporanKegiatan.create).toHaveBeenCalledWith(expect.objectContaining({
                dokumentasi_laporan: null
            }), expect.any(Object));
            expect(mockTransactionObj.commit).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('7. Create laporan dengan file', async () => {
            const today = new Date().toISOString().split('T')[0];
            req.body = { id_penugasan: 'PN1', deskripsi_laporan: 'Desc with file' };
            req.file = { filename: 'pic.jpg' };
            
            const mockPenugasanInstance = { 
                status: 'pending',
                agenda: { tanggal_kegiatan: today },
                update: jest.fn().mockResolvedValue(true)
            };
            mockPenugasan.findOne.mockResolvedValue(mockPenugasanInstance);
            mockLaporanKegiatan.create.mockResolvedValue({ id_laporan: 'LK001' });

            await LaporanKegiatanController.addLaporan(req, res);

            expect(mockLaporanKegiatan.create).toHaveBeenCalledWith(expect.objectContaining({
                dokumentasi_laporan: 'pic.jpg'
            }), expect.any(Object));
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('8. Deskripsi dipotong max 50 karakter', async () => {
            const longDesc = 'A'.repeat(100);
            const today = new Date().toISOString().split('T')[0];
            req.body = { id_penugasan: 'PN1', deskripsi_laporan: longDesc };
            
            const mockPenugasanInstance = { 
                status: 'pending', 
                agenda: { tanggal_kegiatan: today },
                update: jest.fn() 
            };
            mockPenugasan.findOne.mockResolvedValue(mockPenugasanInstance);
            mockLaporanKegiatan.create.mockResolvedValue({});

            await LaporanKegiatanController.addLaporan(req, res);

            expect(mockLaporanKegiatan.create).toHaveBeenCalledWith(expect.objectContaining({
                deskripsi_laporan: 'A'.repeat(50)
            }), expect.any(Object));
        });

        test('9. Update status penugasan dari pending → progress', async () => {
            const today = new Date().toISOString().split('T')[0];
            req.body = { id_penugasan: 'PN1', deskripsi_laporan: 'D1' };
            
            const mockUpdate = jest.fn().mockResolvedValue(true);
            const mockPenugasanInstance = { 
                status: 'pending', 
                agenda: { tanggal_kegiatan: today },
                update: mockUpdate
            };
            mockPenugasan.findOne.mockResolvedValue(mockPenugasanInstance);
            mockLaporanKegiatan.create.mockResolvedValue({});

            await LaporanKegiatanController.addLaporan(req, res);

            expect(mockUpdate).toHaveBeenCalledWith({ status: 'progress' }, expect.any(Object));
        });

        test('10. Rollback jika create gagal', async () => {
            const today = new Date().toISOString().split('T')[0];
            req.body = { id_penugasan: 'PN1', deskripsi_laporan: 'D1' };
            mockPenugasan.findOne.mockResolvedValue({ agenda: { tanggal_kegiatan: today } });
            mockLaporanKegiatan.create.mockRejectedValue(new Error('Create Fail'));

            await LaporanKegiatanController.addLaporan(req, res);

            expect(mockTransactionObj.rollback).toHaveBeenCalled();
            expect(errorSpy).toHaveBeenCalled();
        });

        test('11. Rollback jika update penugasan gagal', async () => {
            const today = new Date().toISOString().split('T')[0];
            req.body = { id_penugasan: 'PN1', deskripsi_laporan: 'D1' };
            const mockPenugasanInstance = { 
                status: 'pending', 
                agenda: { tanggal_kegiatan: today },
                update: jest.fn().mockRejectedValue(new Error('Update Fail'))
            };
            mockPenugasan.findOne.mockResolvedValue(mockPenugasanInstance);
            mockLaporanKegiatan.create.mockResolvedValue({});

            await LaporanKegiatanController.addLaporan(req, res);

            expect(mockTransactionObj.rollback).toHaveBeenCalled();
            expect(errorSpy).toHaveBeenCalled();
        });
    });

    describe('3. getLaporanByPenugasan()', () => {
        let responseSpy, errorSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(LaporanKegiatanController, 'sendResponse');
            errorSpy = jest.spyOn(LaporanKegiatanController, 'sendError');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('1. Return 403 jika staff tidak punya assignment', async () => {
            req.params = { id_penugasan: 'PN1' };
            req.user.nama_role = 'Staff Protokol';
            mockSlotAgendaStaff.findOne.mockResolvedValue(null);

            await LaporanKegiatanController.getLaporanByPenugasan(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(responseSpy).toHaveBeenCalledWith(res, 403, false, expect.any(String));
        });

        test('2. Return 200 jika berhasil ambil data', async () => {
            req.params = { id_penugasan: 'PN1' };
            req.user.nama_role = 'Kasubag Protokol'; 
            const mockLaporanData = [{ id_laporan: 'LK1' }];
            mockLaporanKegiatan.findAll.mockResolvedValue(mockLaporanData);

            await LaporanKegiatanController.getLaporanByPenugasan(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(responseSpy).toHaveBeenCalledWith(res, 200, true, expect.any(String), mockLaporanData);
        });

        test('3. Handle error jika findAll gagal', async () => {
            req.params = { id_penugasan: 'PN1' };
            // Ensure auth check passes
            mockSlotAgendaStaff.findOne.mockResolvedValue({ id_user_staff: 'USR001' });
            // Fail at findAll
            mockLaporanKegiatan.findAll.mockRejectedValue(new Error('FindAll Fail'));
            
            await LaporanKegiatanController.getLaporanByPenugasan(req, res);
            expect(errorSpy).toHaveBeenCalled();
        });
    });

    describe('4. deleteLaporan()', () => {
        let responseSpy, errorSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(LaporanKegiatanController, 'sendResponse');
            errorSpy = jest.spyOn(LaporanKegiatanController, 'sendError');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('1. Return 404 jika laporan tidak ditemukan / bukan milik user', async () => {
            req.params = { id_laporan: 'LK1' };
            mockLaporanKegiatan.findOne.mockResolvedValue(null);

            await LaporanKegiatanController.deleteLaporan(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(responseSpy).toHaveBeenCalledWith(res, 404, false, expect.any(String));
        });

        test('2. Hapus file jika exists', async () => {
            req.params = { id_laporan: 'LK1' };
            const mockLaporanInstance = { 
                id_laporan: 'LK1', 
                dokumentasi_laporan: 'pic.jpg',
                destroy: jest.fn().mockResolvedValue(true)
            };
            mockLaporanKegiatan.findOne.mockResolvedValue(mockLaporanInstance);
            fs.existsSync.mockReturnValue(true);

            await LaporanKegiatanController.deleteLaporan(req, res);

            expect(fs.unlinkSync).toHaveBeenCalled();
            expect(mockLaporanInstance.destroy).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('3. Tidak error jika file tidak ada di disk', async () => {
            req.params = { id_laporan: 'LK1' };
            const mockLaporanInstance = { 
                id_laporan: 'LK1', 
                dokumentasi_laporan: 'pic.jpg',
                destroy: jest.fn().mockResolvedValue(true)
            };
            mockLaporanKegiatan.findOne.mockResolvedValue(mockLaporanInstance);
            fs.existsSync.mockReturnValue(false);

            await LaporanKegiatanController.deleteLaporan(req, res);

            expect(fs.unlinkSync).not.toHaveBeenCalled();
            expect(mockLaporanInstance.destroy).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('4. Skip file handling jika tidak ada dokumentasi', async () => {
            req.params = { id_laporan: 'LK1' };
            const mockLaporanInstance = { 
                id_laporan: 'LK1', 
                dokumentasi_laporan: null,
                destroy: jest.fn().mockResolvedValue(true)
            };
            mockLaporanKegiatan.findOne.mockResolvedValue(mockLaporanInstance);

            await LaporanKegiatanController.deleteLaporan(req, res);

            expect(fs.existsSync).not.toHaveBeenCalled();
            expect(mockLaporanInstance.destroy).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('5. Return 500 jika destroy gagal', async () => {
            req.params = { id_laporan: 'LK1' };
            const mockLaporanInstance = { 
                destroy: jest.fn().mockRejectedValue(new Error('Destroy Fail'))
            };
            mockLaporanKegiatan.findOne.mockResolvedValue(mockLaporanInstance);

            await LaporanKegiatanController.deleteLaporan(req, res);

            expect(errorSpy).toHaveBeenCalled();
        });
    });
});
