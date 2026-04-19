// Mock dependencies first
jest.mock('../../../models', () => {
    return {
        KASKPD: {
            findAll: jest.fn(),
            findByPk: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            destroy: jest.fn(),
        },
        KASKPDPendamping: {
            findOne: jest.fn(),
        }
    };
});

const KASKPDController = require('../../../controllers/kaskpdController');
const { KASKPD, KASKPDPendamping } = require('../../../models');

describe('KASKPDController Unit Tests', () => {
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

    describe('1. getAll()', () => {
        let responseSpy, errorSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(KASKPDController, 'sendResponse');
            errorSpy = jest.spyOn(KASKPDController, 'sendError');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('1. Return 200 dan data KaSKPD berhasil diambil', async () => {
            const mockData = [{ id_ka_skpd: 'KS001', nama_instansi: 'Instansi A' }];
            KASKPD.findAll.mockResolvedValue(mockData);

            await KASKPDController.getAll(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(responseSpy).toHaveBeenCalledWith(res, 200, true, expect.any(String), mockData);
        });

        test('2. Pastikan order ASC digunakan pada id_ka_skpd', async () => {
            KASKPD.findAll.mockResolvedValue([]);
            await KASKPDController.getAll(req, res);

            expect(KASKPD.findAll).toHaveBeenCalledWith(expect.objectContaining({
                order: [['id_ka_skpd', 'ASC']]
            }));
        });

        test('3. Return error jika database gagal', async () => {
            const error = new Error('DB Error');
            KASKPD.findAll.mockRejectedValue(error);

            await KASKPDController.getAll(req, res);
            expect(errorSpy).toHaveBeenCalledWith(res, error, expect.any(String));
        });
    });

    describe('2. create()', () => {
        let responseSpy, errorSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(KASKPDController, 'sendResponse');
            errorSpy = jest.spyOn(KASKPDController, 'sendError');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('1. Return 400 jika nama_instansi kosong', async () => {
            req.body = { nama_instansi: '' };
            await KASKPDController.create(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(responseSpy).toHaveBeenCalledWith(res, 400, false, 'Nama instansi harus diisi');
        });

        test('2. Create sukses dengan ID manual', async () => {
            req.body = { id_ka_skpd: 'MANUAL01', nama_instansi: 'Manual Instansi' };
            KASKPD.findByPk.mockResolvedValue(null);
            KASKPD.create.mockResolvedValue({ id_ka_skpd: 'MANUAL01', ...req.body });

            await KASKPDController.create(req, res);

            expect(KASKPD.create).toHaveBeenCalledWith(expect.objectContaining({
                id_ka_skpd: 'MANUAL01'
            }));
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('3. Create sukses dengan auto ID (tidak ada data sebelumnya)', async () => {
            req.body = { nama_instansi: 'Auto Instansi' };
            KASKPD.findAll.mockResolvedValue([]);
            KASKPD.findByPk.mockResolvedValue(null);
            KASKPD.create.mockResolvedValue({ id_ka_skpd: 'KS001', ...req.body });

            await KASKPDController.create(req, res);

            expect(KASKPD.create).toHaveBeenCalledWith(expect.objectContaining({
                id_ka_skpd: 'KS001'
            }));
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('4. Create sukses dengan auto ID increment (KS005 → KS006)', async () => {
            req.body = { nama_instansi: 'Next Instansi' };
            KASKPD.findAll.mockResolvedValue([{ id_ka_skpd: 'KS005' }]);
            KASKPD.findByPk.mockResolvedValue(null);
            KASKPD.create.mockResolvedValue({ id_ka_skpd: 'KS006', ...req.body });

            await KASKPDController.create(req, res);

            expect(KASKPD.create).toHaveBeenCalledWith(expect.objectContaining({
                id_ka_skpd: 'KS006'
            }));
        });

        test('5. Abaikan ID tidak valid (ABC → KS001)', async () => {
            req.body = { nama_instansi: 'Recover Instansi' };
            KASKPD.findAll.mockResolvedValue([{ id_ka_skpd: 'ABC' }]);
            KASKPD.findByPk.mockResolvedValue(null);
            KASKPD.create.mockResolvedValue({ id_ka_skpd: 'KS001', ...req.body });

            await KASKPDController.create(req, res);

            expect(KASKPD.create).toHaveBeenCalledWith(expect.objectContaining({
                id_ka_skpd: 'KS001'
            }));
        });

        test('6. Return 400 jika ID sudah ada', async () => {
            req.body = { id_ka_skpd: 'KS001', nama_instansi: 'Duplicate' };
            KASKPD.findByPk.mockResolvedValue({ id_ka_skpd: 'KS001' });

            await KASKPDController.create(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(responseSpy).toHaveBeenCalledWith(res, 400, false, expect.stringContaining('KS001 sudah ada'));
        });

        test('7. Pastikan KASKPD.create dipanggil dengan data benar', async () => {
            req.body = { id_ka_skpd: 'KS123', nama_instansi: 'Exact Match' };
            KASKPD.findByPk.mockResolvedValue(null);
            KASKPD.create.mockResolvedValue({ id_ka_skpd: 'KS123', ...req.body });

            await KASKPDController.create(req, res);

            expect(KASKPD.create).toHaveBeenCalledWith({
                id_ka_skpd: 'KS123',
                nama_instansi: 'Exact Match'
            });
        });

        test('8. Return error jika create gagal', async () => {
            req.body = { nama_instansi: 'Error Trigger' };
            KASKPD.findAll.mockResolvedValue([]);
            KASKPD.findByPk.mockResolvedValue(null);
            const error = new Error('Creation Failed');
            KASKPD.create.mockRejectedValue(error);

            await KASKPDController.create(req, res);
            expect(errorSpy).toHaveBeenCalledWith(res, error, expect.any(String));
        });

        test('9. Create sukses dengan auto ID dari multiple data (KS001, KS005 → KS006)', async () => {
            KASKPD.findAll.mockResolvedValue([
                { id_ka_skpd: 'KS001' },
                { id_ka_skpd: 'KS005' },
                { id_ka_skpd: 'KS002' }
            ]);
            KASKPD.findByPk.mockResolvedValue(null);
            KASKPD.create.mockResolvedValue({ id_ka_skpd: 'KS006', nama_instansi: 'Multiple Test' });

            req.body = { nama_instansi: 'Multiple Test' };
            await KASKPDController.create(req, res);

            expect(KASKPD.create).toHaveBeenCalledWith(
                expect.objectContaining({ id_ka_skpd: 'KS006' })
            );
        });
    });

    describe('3. update()', () => {
        let responseSpy, errorSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(KASKPDController, 'sendResponse');
            errorSpy = jest.spyOn(KASKPDController, 'sendError');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('1. Return 404 jika data tidak ditemukan', async () => {
            req.params = { id: 'KS999' };
            KASKPD.findByPk.mockResolvedValue(null);

            await KASKPDController.update(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(responseSpy).toHaveBeenCalledWith(res, 404, false, 'KaSKPD tidak ditemukan');
        });

        test('2. Update sukses → return 200', async () => {
            req.params = { id: 'KS001' };
            req.body = { nama_instansi: 'New Name' };
            const mockData = { update: jest.fn().mockResolvedValue(true) };
            KASKPD.findByPk.mockResolvedValue(mockData);

            await KASKPDController.update(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(responseSpy).toHaveBeenCalledWith(res, 200, true, 'KaSKPD berhasil diupdate', mockData);
        });

        test('3. Pastikan data.update dipanggil dengan nama_instansi', async () => {
            req.params = { id: 'KS001' };
            req.body = { nama_instansi: 'Validated Name' };
            const mockData = { update: jest.fn().mockResolvedValue(true) };
            KASKPD.findByPk.mockResolvedValue(mockData);

            await KASKPDController.update(req, res);

            expect(mockData.update).toHaveBeenCalledWith({
                nama_instansi: 'Validated Name'
            });
        });

        test('4. Return error jika database gagal', async () => {
            req.params = { id: 'KS001' };
            const error = new Error('Update Failure');
            KASKPD.findByPk.mockRejectedValue(error);

            await KASKPDController.update(req, res);
            expect(errorSpy).toHaveBeenCalledWith(res, error, expect.any(String));
        });
    });

    describe('4. delete()', () => {
        let responseSpy, errorSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(KASKPDController, 'sendResponse');
            errorSpy = jest.spyOn(KASKPDController, 'sendError');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('1. Return 404 jika data tidak ditemukan', async () => {
            req.params = { id: 'KS999' };
            KASKPD.findByPk.mockResolvedValue(null);

            await KASKPDController.delete(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(responseSpy).toHaveBeenCalledWith(res, 404, false, 'KaSKPD tidak ditemukan');
        });

        test('2. Delete sukses → return 200', async () => {
            req.params = { id: 'KS001' };
            const mockData = { destroy: jest.fn().mockResolvedValue(true) };
            KASKPD.findByPk.mockResolvedValue(mockData);
            KASKPDPendamping.findOne.mockResolvedValue(null);

            await KASKPDController.delete(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(responseSpy).toHaveBeenCalledWith(res, 200, true, 'KaSKPD berhasil dihapus');
        });

        test('3. Pastikan data.destroy dipanggil', async () => {
            req.params = { id: 'KS001' };
            const mockData = { destroy: jest.fn().mockResolvedValue(true) };
            KASKPD.findByPk.mockResolvedValue(mockData);
            KASKPDPendamping.findOne.mockResolvedValue(null);

            await KASKPDController.delete(req, res);
            expect(mockData.destroy).toHaveBeenCalled();
        });

        test('4. Return 400 jika KaSKPD sudah digunakan dalam agenda', async () => {
            req.params = { id: 'KS001' };
            const mockData = { id_ka_skpd: 'KS001' };
            KASKPD.findByPk.mockResolvedValue(mockData);
            KASKPDPendamping.findOne.mockResolvedValue({ id_ka_skpd: 'KS001' });

            await KASKPDController.delete(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(responseSpy).toHaveBeenCalledWith(res, 400, false, expect.stringContaining('sudah digunakan'));
        });

        test('5. Return error jika database gagal', async () => {
            req.params = { id: 'KS001' };
            const error = new Error('Deletion Failure');
            KASKPD.findByPk.mockRejectedValue(error);

            await KASKPDController.delete(req, res);
            expect(errorSpy).toHaveBeenCalledWith(res, error, expect.any(String));
        });
    });
});
