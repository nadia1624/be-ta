jest.mock('../../../models', () => ({
    NotificationSubscription: {
        findOne: jest.fn(),
        create: jest.fn(),
        destroy: jest.fn(),
    },
}));

const NotificationController = require('../../../controllers/notificationController');
const { NotificationSubscription } = require('../../../models');

describe('NotificationController Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            user: { id_user: 'USR001' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
    });

    describe('1. subscribe()', () => {
        let responseSpy, errorSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(NotificationController, 'sendResponse');
            errorSpy = jest.spyOn(NotificationController, 'sendError');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('1. Return 400 jika endpoint kosong', async () => {
            req.body = { keys: { p256dh: 'p1', auth: 'a1' } };
            await NotificationController.subscribe(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(responseSpy).toHaveBeenCalledWith(res, 400, false, expect.any(String));
        });

        test('2. Return 400 jika keys kosong', async () => {
            req.body = { endpoint: 'e1' };
            await NotificationController.subscribe(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('3. Return 400 jika keys.p256dh kosong', async () => {
            req.body = { endpoint: 'e1', keys: { auth: 'a1' } };
            await NotificationController.subscribe(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('4. Return 400 jika keys.auth kosong', async () => {
            req.body = { endpoint: 'e1', keys: { p256dh: 'p1' } };
            await NotificationController.subscribe(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('5. Update subscription jika endpoint sudah ada', async () => {
            const mockSub = { 
                id_user: 'OLD', 
                save: jest.fn().mockResolvedValue(true) 
            };
            req.body = { endpoint: 'e1', keys: { p256dh: 'p1', auth: 'a1' } };
            NotificationSubscription.findOne.mockResolvedValue(mockSub);

            await NotificationController.subscribe(req, res);

            expect(mockSub.id_user).toBe('USR001');
            expect(mockSub.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(responseSpy).toHaveBeenCalledWith(res, 201, true, expect.any(String), mockSub);
        });

        test('6. Create subscription jika endpoint belum ada', async () => {
            req.body = { endpoint: 'e1', keys: { p256dh: 'p1', auth: 'a1' } };
            NotificationSubscription.findOne.mockResolvedValue(null);
            NotificationSubscription.create.mockResolvedValue({ id: 1, ...req.body });

            await NotificationController.subscribe(req, res);

            expect(NotificationSubscription.create).toHaveBeenCalledWith(expect.objectContaining({
                id_user: 'USR001',
                endpoint: 'e1'
            }));
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('7. Handle error jika findOne gagal', async () => {
            req.body = { endpoint: 'e1', keys: { p256dh: 'p1', auth: 'a1' } };
            const error = new Error('Find failed');
            NotificationSubscription.findOne.mockRejectedValue(error);

            await NotificationController.subscribe(req, res);

            expect(errorSpy).toHaveBeenCalledWith(res, error, expect.any(String));
        });

        test('8. Handle error jika create gagal', async () => {
            req.body = { endpoint: 'e1', keys: { p256dh: 'p1', auth: 'a1' } };
            NotificationSubscription.findOne.mockResolvedValue(null);
            const error = new Error('Create failed');
            NotificationSubscription.create.mockRejectedValue(error);

            await NotificationController.subscribe(req, res);

            expect(errorSpy).toHaveBeenCalledWith(res, error, expect.any(String));
        });

        test('9. Handle error jika save gagal', async () => {
            const mockSub = { save: jest.fn() };
            req.body = { endpoint: 'e1', keys: { p256dh: 'p1', auth: 'a1' } };
            NotificationSubscription.findOne.mockResolvedValue(mockSub);
            const error = new Error('Save failed');
            mockSub.save.mockRejectedValue(error);

            await NotificationController.subscribe(req, res);

            expect(errorSpy).toHaveBeenCalledWith(res, error, expect.any(String));
        });
    });

    describe('2. unsubscribe()', () => {
        let responseSpy, errorSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(NotificationController, 'sendResponse');
            errorSpy = jest.spyOn(NotificationController, 'sendError');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('1. Return 400 jika endpoint kosong', async () => {
            req.body = {};
            await NotificationController.unsubscribe(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(responseSpy).toHaveBeenCalledWith(res, 400, false, expect.any(String));
        });

        test('2. Return 200 jika berhasil unsubscribe (destroy return 1)', async () => {
            req.body = { endpoint: 'e1' };
            NotificationSubscription.destroy.mockResolvedValue(1);

            await NotificationController.unsubscribe(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(responseSpy).toHaveBeenCalledWith(res, 200, true, 'Unsubscribed successfully');
        });

        test('3. Return 200 jika subscription tidak ditemukan (destroy return 0)', async () => {
            req.body = { endpoint: 'e1' };
            NotificationSubscription.destroy.mockResolvedValue(0);

            await NotificationController.unsubscribe(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(responseSpy).toHaveBeenCalledWith(res, 200, true, 'Subscription not found');
        });

        test('4. Handle error jika destroy gagal', async () => {
            req.body = { endpoint: 'e1' };
            const error = new Error('Destroy failed');
            NotificationSubscription.destroy.mockRejectedValue(error);

            await NotificationController.unsubscribe(req, res);

            expect(errorSpy).toHaveBeenCalledWith(res, error, expect.any(String));
        });
    });
});
