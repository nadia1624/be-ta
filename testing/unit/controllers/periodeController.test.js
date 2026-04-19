// Mock dependencies first
jest.mock('../../../models', () => {
    return {
        Periode: {
            findAll: jest.fn(),
            findByPk: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        }
    };
});

const PeriodeController = require('../../../controllers/periodeController');
const { Periode } = require('../../../models');

describe('PeriodeController Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
    });

    describe('1. createPeriode()', () => {
        let responseSpy, errorSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(PeriodeController, 'sendResponse');
            errorSpy = jest.spyOn(PeriodeController, 'sendError');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('1. Return 201 jika berhasil create periode (tanpa data sebelumnya)', async () => {
            req.body = { nama_periode: 'Periode 2024' };
            Periode.findAll.mockResolvedValue([]);
            const mockNewPeriode = { id_periode: 'PD001', ...req.body };
            Periode.create.mockResolvedValue(mockNewPeriode);

            await PeriodeController.createPeriode(req, res);

            expect(Periode.create).toHaveBeenCalledWith(expect.objectContaining({
                id_periode: 'PD001'
            }));
            expect(res.status).toHaveBeenCalledWith(201);
            expect(responseSpy).toHaveBeenCalledWith(res, 201, true, expect.any(String), mockNewPeriode);
        });

        test('2. Return 201 dengan ID increment (PD005 → PD006)', async () => {
            req.body = { nama_periode: 'Periode 2026' };
            Periode.findAll.mockResolvedValue([{ id_periode: 'PD005' }]);
            Periode.create.mockResolvedValue({ id_periode: 'PD006' });

            await PeriodeController.createPeriode(req, res);

            expect(Periode.create).toHaveBeenCalledWith(expect.objectContaining({
                id_periode: 'PD006'
            }));
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('3. Abaikan ID tidak valid (ABC → PD001)', async () => {
            req.body = { nama_periode: 'Periode 2024' };
            Periode.findAll.mockResolvedValue([{ id_periode: 'ABC' }]);
            Periode.create.mockResolvedValue({ id_periode: 'PD001' });

            await PeriodeController.createPeriode(req, res);

            expect(Periode.create).toHaveBeenCalledWith(expect.objectContaining({
                id_periode: 'PD001'
            }));
        });

        test('4. Default status_periode = "aktif" jika tidak diisi', async () => {
            req.body = { nama_periode: 'Periode 2024' };
            Periode.findAll.mockResolvedValue([]);
            Periode.create.mockResolvedValue({ id_periode: 'PD001' });

            await PeriodeController.createPeriode(req, res);

            expect(Periode.create).toHaveBeenCalledWith(expect.objectContaining({
                status_periode: 'aktif'
            }));
        });

        test('5. Pastikan Periode.create dipanggil dengan data yang benar', async () => {
            req.body = { 
                nama_periode: 'Test Name', tanggal_mulai: '2024-01-01', 
                tanggal_selesai: '2024-12-31', status_periode: 'nonaktif' 
            };
            Periode.findAll.mockResolvedValue([]);
            Periode.create.mockResolvedValue({ id_periode: 'PD001' });

            await PeriodeController.createPeriode(req, res);

            expect(Periode.create).toHaveBeenCalledWith(expect.objectContaining({
                nama_periode: 'Test Name',
                tanggal_mulai: '2024-01-01',
                tanggal_selesai: '2024-12-31',
                status_periode: 'nonaktif'
            }));
        });

        test('6. Return error jika Periode.create gagal', async () => {
            req.body = { nama_periode: 'Err' };
            Periode.findAll.mockResolvedValue([]);
            const error = new Error('Create Fail');
            Periode.create.mockRejectedValue(error);

            await PeriodeController.createPeriode(req, res);

            expect(errorSpy).toHaveBeenCalledWith(res, error, expect.any(String));
        });
    });

    describe('2. getAllPeriode()', () => {
        let responseSpy, errorSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(PeriodeController, 'sendResponse');
            errorSpy = jest.spyOn(PeriodeController, 'sendError');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('1. Return 200 dan data periode', async () => {
            const mockData = [{ id_periode: 'PD001' }];
            Periode.findAll.mockResolvedValue(mockData);

            await PeriodeController.getAllPeriode(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(responseSpy).toHaveBeenCalledWith(res, 200, true, expect.any(String), mockData);
        });

        test('2. Pastikan order DESC digunakan pada createdAt', async () => {
            Periode.findAll.mockResolvedValue([]);
            await PeriodeController.getAllPeriode(req, res);

            expect(Periode.findAll).toHaveBeenCalledWith(expect.objectContaining({
                order: [['createdAt', 'DESC']]
            }));
        });

        test('3. Return error jika database gagal', async () => {
            const error = new Error('DB Error');
            Periode.findAll.mockRejectedValue(error);

            await PeriodeController.getAllPeriode(req, res);
            expect(errorSpy).toHaveBeenCalledWith(res, error, expect.any(String));
        });
    });

    describe('3. updatePeriode()', () => {
        let responseSpy, errorSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(PeriodeController, 'sendResponse');
            errorSpy = jest.spyOn(PeriodeController, 'sendError');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('1. Return 404 jika periode tidak ditemukan', async () => {
            req.params = { id: 'PD999' };
            Periode.findByPk.mockResolvedValue(null);

            await PeriodeController.updatePeriode(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(responseSpy).toHaveBeenCalledWith(res, 404, false, 'Periode tidak ditemukan');
        });

        test('2. Update berhasil → return 200', async () => {
            req.params = { id: 'PD001' };
            req.body = { nama_periode: 'New Name' };
            const mockPeriode = { update: jest.fn().mockResolvedValue(true) };
            Periode.findByPk.mockResolvedValue(mockPeriode);

            await PeriodeController.updatePeriode(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(responseSpy).toHaveBeenCalledWith(res, 200, true, 'Periode berhasil diupdate', mockPeriode);
        });

        test('3. Pastikan periode.update dipanggil dengan data yang benar', async () => {
            req.params = { id: 'PD001' };
            req.body = { nama_periode: 'Actual Update', keterangan: 'Updated' };
            const mockPeriode = { update: jest.fn().mockResolvedValue(true) };
            Periode.findByPk.mockResolvedValue(mockPeriode);

            await PeriodeController.updatePeriode(req, res);

            expect(mockPeriode.update).toHaveBeenCalledWith(expect.objectContaining({
                nama_periode: 'Actual Update',
                keterangan: 'Updated'
            }));
        });

        test('4. Return error jika database gagal', async () => {
            req.params = { id: 'PD001' };
            const error = new Error('Update Error');
            Periode.findByPk.mockRejectedValue(error);

            await PeriodeController.updatePeriode(req, res);
            expect(errorSpy).toHaveBeenCalledWith(res, error, expect.any(String));
        });
    });


});
