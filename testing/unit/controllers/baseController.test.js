const BaseController = require('../../../controllers/BaseController');

describe('BaseController Unit Tests', () => {
    let baseController;
    let res;

    beforeEach(() => {
        baseController = new BaseController();
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('sendResponse()', () => {
        test('1. Response tanpa data', () => {
            baseController.sendResponse(res, 200, true, 'OK', null);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'OK'
                // data should not be present
            });
            
            const responseCall = res.json.mock.calls[0][0];
            expect(responseCall).not.toHaveProperty('data');
        });

        test('2. Response dengan data', () => {
            const data = { id: 1 };
            baseController.sendResponse(res, 201, true, 'Success', data);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Success',
                data: data
            });
        });

        test('3. Pastikan method chaining bekerja', () => {
            const result = baseController.sendResponse(res, 200, true, 'Chaining');
            
            // Check that the return value is the result of chaining res.status().json()
            expect(res.status).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalled();
            expect(result).toBe(res);
        });
    });

    describe('sendError()', () => {
        let consoleSpy;
        let responseSpy;

        beforeEach(() => {
            consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            responseSpy = jest.spyOn(baseController, 'sendResponse');
        });

        afterEach(() => {
            consoleSpy.mockRestore();
            responseSpy.mockRestore();
        });

        test('1. Error memiliki message', () => {
            const error = new Error('Database error');
            baseController.sendError(res, error);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Database error'
            }));
        });

        test('2. Error tanpa message (fallback ke customMessage)', () => {
            const error = {};
            const customMessage = 'Custom error';
            baseController.sendError(res, error, customMessage);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Custom error'
            }));
        });

        test('3. Pastikan console.error dipanggil', () => {
            const error = new Error('Log error');
            baseController.sendError(res, error);

            expect(consoleSpy).toHaveBeenCalled();
            expect(consoleSpy.mock.calls[0][0]).toContain('BaseController');
            expect(consoleSpy.mock.calls[0][1]).toBe(error);
        });

        test('4. Pastikan sendResponse dipanggil dari dalam sendError', () => {
            const error = new Error('Internal call error');
            baseController.sendError(res, error, 'Custom fallback');

            expect(responseSpy).toHaveBeenCalledWith(
                res,
                500,
                false,
                'Internal call error'
            );
        });
    });
});
