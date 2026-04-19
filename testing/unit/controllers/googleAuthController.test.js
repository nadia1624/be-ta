jest.mock('../../../models', () => ({
    Pimpinan: {
        findByPk: jest.fn(),
    },
}));

jest.mock('../../../helpers/googleCalendarHelper', () => ({
    getAuthUrl: jest.fn(),
    getTokens: jest.fn(),
}));

const GoogleAuthController = require('../../../controllers/googleAuthController');
const { Pimpinan } = require('../../../models');
const googleCalendarHelper = require('../../../helpers/googleCalendarHelper');

describe('GoogleAuthController Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: {},
            query: {},
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
            redirect: jest.fn().mockReturnThis(),
        };
        process.env.FRONTEND_URL = 'http://test-fe.com';
        jest.clearAllMocks();
    });

    describe('1. initiateAuth()', () => {
        let responseSpy, errorSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(GoogleAuthController, 'sendResponse');
            errorSpy = jest.spyOn(GoogleAuthController, 'sendError');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('1. Return 404 jika pimpinan tidak ditemukan', async () => {
            req.params = { id_pimpinan: 'P1' };
            Pimpinan.findByPk.mockResolvedValue(null);

            await GoogleAuthController.initiateAuth(req, res);

            expect(Pimpinan.findByPk).toHaveBeenCalledWith('P1');
            expect(res.status).toHaveBeenCalledWith(404);
            expect(responseSpy).toHaveBeenCalledWith(res, 404, false, 'Pimpinan tidak ditemukan');
        });

        test('2. Redirect ke Google Auth URL jika berhasil', async () => {
            req.params = { id_pimpinan: 'P1' };
            Pimpinan.findByPk.mockResolvedValue({ id_pimpinan: 'P1' });
            googleCalendarHelper.getAuthUrl.mockReturnValue('https://google.com/auth');

            await GoogleAuthController.initiateAuth(req, res);

            expect(googleCalendarHelper.getAuthUrl).toHaveBeenCalledWith('P1');
            expect(res.redirect).toHaveBeenCalledWith('https://google.com/auth');
        });

        test('3. Handle error jika findByPk gagal', async () => {
            req.params = { id_pimpinan: 'P1' };
            const error = new Error('DB Error');
            Pimpinan.findByPk.mockRejectedValue(error);

            await GoogleAuthController.initiateAuth(req, res);

            expect(errorSpy).toHaveBeenCalledWith(res, error, expect.any(String));
        });
    });

    describe('2. handleCallback()', () => {
        test('1. Return 400 jika code tidak ada', async () => {
            req.query = { state: 'P1' }; // state is id_pimpinan
            await GoogleAuthController.handleCallback(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith('Authorization code missing');
        });

        test('2. Return 404 jika pimpinan tidak ditemukan', async () => {
            req.query = { code: 'C1', state: 'P1' };
            googleCalendarHelper.getTokens.mockResolvedValue({ access_token: 'AT' });
            Pimpinan.findByPk.mockResolvedValue(null);

            await GoogleAuthController.handleCallback(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith('Pimpinan not found');
        });

        test('3. Success flow (update tokens & sync status)', async () => {
            req.query = { code: 'C1', state: 'P1' };
            const mockTokens = { 
                access_token: 'AT1', 
                refresh_token: 'RT1', 
                expiry_date: 12345 
            };
            const mockPimpinan = { 
                id_pimpinan: 'P1', 
                nama_pimpinan: 'John Doe',
                update: jest.fn().mockResolvedValue(true) 
            };

            googleCalendarHelper.getTokens.mockResolvedValue(mockTokens);
            Pimpinan.findByPk.mockResolvedValue(mockPimpinan);

            await GoogleAuthController.handleCallback(req, res);

            expect(mockPimpinan.update).toHaveBeenCalledWith({
                google_access_token: 'AT1',
                google_refresh_token: 'RT1',
                google_token_expiry: 12345,
                is_calendar_synced: true
            });
            expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('google-auth-success?nama=John%20Doe'));
        });

        test('4. Edge case: reuse old refresh token if missing in response', async () => {
            req.query = { code: 'C1', state: 'P1' };
            const mockTokens = { access_token: 'AT_NEW' }; // No refresh token
            const mockPimpinan = { 
                id_pimpinan: 'P1', 
                nama_pimpinan: 'P1',
                google_refresh_token: 'RT_OLD',
                update: jest.fn().mockResolvedValue(true) 
            };

            googleCalendarHelper.getTokens.mockResolvedValue(mockTokens);
            Pimpinan.findByPk.mockResolvedValue(mockPimpinan);

            await GoogleAuthController.handleCallback(req, res);

            expect(mockPimpinan.update).toHaveBeenCalledWith(expect.objectContaining({
                google_access_token: 'AT_NEW',
                google_refresh_token: 'RT_OLD'
            }));
        });

        test('5. Redirect ke frontend URL', async () => {
            req.query = { code: 'C1', state: 'P1' };
            googleCalendarHelper.getTokens.mockResolvedValue({ access_token: 'AT' });
            Pimpinan.findByPk.mockResolvedValue({ 
                nama_pimpinan: 'A B', 
                update: jest.fn() 
            });
            process.env.FRONTEND_URL = 'http://my-fe.com';

            await GoogleAuthController.handleCallback(req, res);

            expect(res.redirect).toHaveBeenCalledWith('http://my-fe.com/google-auth-success?nama=A%20B');
        });

        test('6. Return 500 jika getTokens gagal', async () => {
            req.query = { code: 'C1', state: 'P1' };
            googleCalendarHelper.getTokens.mockRejectedValue(new Error('Auth Fail'));

            await GoogleAuthController.handleCallback(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(expect.any(String));
        });

        test('7. Return 500 jika update gagal', async () => {
            req.query = { code: 'C1', state: 'P1' };
            googleCalendarHelper.getTokens.mockResolvedValue({ access_token: 'AT' });
            const mockPimpinan = { update: jest.fn().mockRejectedValue(new Error('Update Fail')) };
            Pimpinan.findByPk.mockResolvedValue(mockPimpinan);

            await GoogleAuthController.handleCallback(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('3. getAuthUrl()', () => {
        let responseSpy, errorSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(GoogleAuthController, 'sendResponse');
            errorSpy = jest.spyOn(GoogleAuthController, 'sendError');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('1. Return 200 with authUrl', async () => {
            req.params = { id_pimpinan: 'P1' };
            googleCalendarHelper.getAuthUrl.mockReturnValue('https://google.com/auth');

            await GoogleAuthController.getAuthUrl(req, res);

            expect(googleCalendarHelper.getAuthUrl).toHaveBeenCalledWith('P1');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(responseSpy).toHaveBeenCalledWith(res, 200, true, expect.any(String), { authUrl: 'https://google.com/auth' });
        });

        test('2. Handle helper error', async () => {
            req.params = { id_pimpinan: 'P1' };
            const error = new Error('Helper Fail');
            googleCalendarHelper.getAuthUrl.mockImplementation(() => { throw error; });

            await GoogleAuthController.getAuthUrl(req, res);

            expect(errorSpy).toHaveBeenCalledWith(res, error, expect.any(String));
        });
    });
});
