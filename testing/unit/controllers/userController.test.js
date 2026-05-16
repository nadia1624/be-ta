// Mock dependencies first
const mockOp = {
    col: jest.fn()
};

jest.mock('../../../models', () => {
    return {
        User: {
            findOne: jest.fn(),
            findAll: jest.fn(),
            findByPk: jest.fn(),
            create: jest.fn(),
            destroy: jest.fn(),
        },
        Role: {
            findAll: jest.fn(),
        },
        PimpinanAjudan: {
            destroy: jest.fn(),
        },
        PeriodeJabatan: {},
        Pimpinan: {},
        Periode: {},
        Sequelize: {
            Op: mockOp
        }
    };
});

jest.mock('bcryptjs', () => ({
    hash: jest.fn(),
}));

const UserController = require('../../../controllers/userController');
const { User, Role, PimpinanAjudan } = require('../../../models');
const bcrypt = require('bcryptjs');

describe('UserController Unit Tests', () => {
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

    describe('1. generateUserId()', () => {
        test('1. Return "U001" jika tidak ada user sebelumnya (findOne return null)', async () => {
            User.findOne.mockResolvedValue(null);
            const id = await UserController.generateUserId();
            expect(id).toBe('U001');
        });

        test('2. Return increment ID jika ada user (misal U005 → U006)', async () => {
            User.findOne.mockResolvedValue({ id_user: 'U005' });
            const id = await UserController.generateUserId();
            expect(id).toBe('U006');
        });

        test('3. Jika id_user tidak valid (tidak diawali U), tetap return "U001"', async () => {
            User.findOne.mockResolvedValue({ id_user: 'X999' });
            const id = await UserController.generateUserId();
            expect(id).toBe('U001');
        });

        test('4. Handle error jika database gagal', async () => {
            User.findOne.mockRejectedValue(new Error('DB Error'));
            await expect(UserController.generateUserId()).rejects.toThrow('DB Error');
        });
    });

    describe('2. getAllUsers()', () => {
        let responseSpy, errorSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(UserController, 'sendResponse');
            errorSpy = jest.spyOn(UserController, 'sendError');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('1. Return 200 dan data users berhasil diambil', async () => {
            const mockUsers = [{ id_user: 'U001', nama: 'Test' }];
            User.findAll.mockResolvedValue(mockUsers);

            await UserController.getAllUsers(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(responseSpy).toHaveBeenCalledWith(res, 200, true, expect.any(String), mockUsers);
        });

        test('2. Pastikan password tidak ikut di response', async () => {
            User.findAll.mockResolvedValue([]);
            await UserController.getAllUsers(req, res);

            expect(User.findAll).toHaveBeenCalledWith(expect.objectContaining({
                attributes: { exclude: ['password'] }
            }));
        });

        test('3. Pastikan include relasi (role, pimpinanAjudans, dll) dipanggil', async () => {
            User.findAll.mockResolvedValue([]);
            await UserController.getAllUsers(req, res);

            expect(User.findAll).toHaveBeenCalledWith(expect.objectContaining({
                include: expect.arrayContaining([
                    expect.objectContaining({ model: Role, as: 'role' }),
                    expect.objectContaining({ model: PimpinanAjudan, as: 'pimpinanAjudans' })
                ])
            }));
        });

        test('4. Return error jika database gagal', async () => {
            const error = new Error('Fetch Error');
            User.findAll.mockRejectedValue(error);

            await UserController.getAllUsers(req, res);

            expect(errorSpy).toHaveBeenCalledWith(res, error, expect.any(String));
        });
    });

    describe('3. createUser()', () => {
        let responseSpy, errorSpy, generateSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(UserController, 'sendResponse');
            errorSpy = jest.spyOn(UserController, 'sendError');
            generateSpy = jest.spyOn(UserController, 'generateUserId').mockResolvedValue('U001');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
            generateSpy.mockRestore();
        });

        test('1. Return 400 jika email sudah terdaftar', async () => {
            req.body = { email: 'exist@mail.com' };
            User.findOne.mockResolvedValue({ id_user: 'UXXX' });

            await UserController.createUser(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(responseSpy).toHaveBeenCalledWith(res, 400, false, 'Email sudah terdaftar');
        });

        test('2. Return 400 jika NIP sudah terdaftar', async () => {
            req.body = { email: 'new@mail.com', nip: '12345' };
            User.findOne.mockResolvedValueOnce(null);
            User.findOne.mockResolvedValueOnce({ id_user: 'UXXX' });

            await UserController.createUser(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(responseSpy).toHaveBeenCalledWith(res, 400, false, 'NIP sudah terdaftar');
        });

        test('3. Sukses create user → return 21', async () => {
            req.body = { nama: 'New User', email: 'n@m.com', password: 'p', role_id: 'R1' };
            User.findOne.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('h');
            User.create.mockResolvedValue({ id_user: 'U1' });

            await UserController.createUser(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(responseSpy).toHaveBeenCalledWith(res, 201, true, 'User berhasil dibuat', expect.any(Object));
        });

        test('4. Pastikan generateUserId dipanggil', async () => {
            req.body = { nama: 'N', email: 'e', password: 'p', role_id: 'R1' };
            User.findOne.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('h');
            
            await UserController.createUser(req, res);
            expect(generateSpy).toHaveBeenCalled();
        });

        test('5. Pastikan bcrypt.hash dipanggil', async () => {
            req.body = { nama: 'N', email: 'e', password: 'plain_password', role_id: 'R1' };
            User.findOne.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('hashed');

            await UserController.createUser(req, res);
            expect(bcrypt.hash).toHaveBeenCalledWith('plain_password', 10);
        });

        test('6. Pastikan password tidak disimpan dalam bentuk plain text', async () => {
            req.body = { nama: 'N', email: 'e', password: 'plain_password', role_id: 'R1' };
            User.findOne.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('hashed_version');

            await UserController.createUser(req, res);
            expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
                password: 'hashed_version'
            }));
            expect(User.create).not.toHaveBeenCalledWith(expect.objectContaining({
                password: 'plain_password'
            }));
        });

        test('7. Default status_aktif = "aktif" jika tidak diisi', async () => {
            req.body = { nama: 'N', email: 'e', password: 'p', role_id: 'R1' };
            User.findOne.mockResolvedValue(null);
            
            await UserController.createUser(req, res);
            expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
                status_aktif: 'aktif'
            }));
        });

        test('8. Return error jika User.create gagal', async () => {
            req.body = { email: 'e', password: 'p' };
            User.findOne.mockResolvedValue(null);
            const error = new Error('Create error');
            User.create.mockRejectedValue(error);

            await UserController.createUser(req, res);
            expect(errorSpy).toHaveBeenCalledWith(res, error, expect.any(String));
        });
    });

    describe('4. updateUser()', () => {
        let responseSpy, errorSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(UserController, 'sendResponse');
            errorSpy = jest.spyOn(UserController, 'sendError');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('1. Return 404 jika user tidak ditemukan', async () => {
            req.params = { id: 'U1' };
            User.findByPk.mockResolvedValue(null);

            await UserController.updateUser(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(responseSpy).toHaveBeenCalledWith(res, 404, false, 'User tidak ditemukan');
        });

        test('2. Update user berhasil tanpa password → return 200', async () => {
            req.params = { id: 'U1' };
            req.body = { nama: 'New' };
            const u = { save: jest.fn() };
            User.findByPk.mockResolvedValue(u);

            await UserController.updateUser(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(responseSpy).toHaveBeenCalledWith(res, 200, true, 'User berhasil diupdate');
        });

        test('3. Update user dengan password → bcrypt.hash dipanggil', async () => {
            req.params = { id: 'U1' };
            req.body = { password: 'new_p' };
            const u = { save: jest.fn() };
            User.findByPk.mockResolvedValue(u);
            bcrypt.hash.mockResolvedValue('h');

            await UserController.updateUser(req, res);
            expect(bcrypt.hash).toHaveBeenCalledWith('new_p', 10);
            expect(u.password).toBe('h');
        });

        test('4. Pastikan field user berubah sesuai input', async () => {
            req.params = { id: 'U1' };
            req.body = { nama: 'Updated Name', nip: '123' };
            const u = { nama: 'old', nip: '0', save: jest.fn() };
            User.findByPk.mockResolvedValue(u);

            await UserController.updateUser(req, res);
            expect(u.nama).toBe('Updated Name');
            expect(u.nip).toBe('123');
            expect(u.save).toHaveBeenCalled();
        });

        test('5. Return error jika database gagal', async () => {
            req.params = { id: 'U1' };
            const error = new Error('Update Error');
            User.findByPk.mockRejectedValue(error);

            await UserController.updateUser(req, res);
            expect(errorSpy).toHaveBeenCalledWith(res, error, expect.any(String));
        });

        test('6. Return 400 jika email sudah digunakan oleh akun lain', async () => {
            req.params = { id: 'U1' };
            req.body = { email: 'exist@mail.com' };
            const u = { id_user: 'U1', save: jest.fn() };
            User.findByPk.mockResolvedValue(u);
            User.findOne.mockResolvedValue({ id_user: 'U2', email: 'exist@mail.com' });

            await UserController.updateUser(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(responseSpy).toHaveBeenCalledWith(res, 400, false, 'Email sudah digunakan oleh akun lain');
        });

        test('7. Return 400 jika NIP sudah digunakan oleh akun lain', async () => {
            req.params = { id: 'U1' };
            req.body = { nip: '12345' };
            const u = { id_user: 'U1', save: jest.fn() };
            User.findByPk.mockResolvedValue(u);
            User.findOne.mockResolvedValue({ id_user: 'U2', nip: '12345' }); // Hanya dipanggil sekali karena email kosong

            await UserController.updateUser(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(responseSpy).toHaveBeenCalledWith(res, 400, false, 'NIP sudah digunakan oleh akun lain');
        });
    });

    describe('5. deleteUser()', () => {
        let responseSpy, errorSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(UserController, 'sendResponse');
            errorSpy = jest.spyOn(UserController, 'sendError');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('1. Delete sukses → return 200', async () => {
            req.body = { id_user: 'U1' };
            User.destroy.mockResolvedValue(1);
            await UserController.deleteUser(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('2. User tidak ditemukan → return 404', async () => {
            req.body = { id_user: 'U1' };
            User.destroy.mockResolvedValue(0);
            await UserController.deleteUser(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('3. Pastikan PimpinanAjudan.destroy dipanggil sebelum User.destroy', async () => {
            req.body = { id_user: 'U1' };
            const callOrder = [];
            PimpinanAjudan.destroy.mockImplementation(() => { callOrder.push('PimpinanAjudan'); return Promise.resolve(); });
            User.destroy.mockImplementation(() => { callOrder.push('User'); return Promise.resolve(1); });

            await UserController.deleteUser(req, res);
            expect(callOrder).toEqual(['PimpinanAjudan', 'User']);
        });

        test('4. Return error jika database gagal', async () => {
            req.body = { id_user: 'U1' };
            const error = new Error('Delete Error');
            User.destroy.mockRejectedValue(error);

            await UserController.deleteUser(req, res);
            expect(errorSpy).toHaveBeenCalledWith(res, error, expect.any(String));
        });
    });

    describe('6. getAllRoles()', () => {
        let responseSpy, errorSpy;

        beforeEach(() => {
            responseSpy = jest.spyOn(UserController, 'sendResponse');
            errorSpy = jest.spyOn(UserController, 'sendError');
        });

        afterEach(() => {
            responseSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('1. Return 200 dan data roles', async () => {
            const roles = [{ id: 'R1' }];
            Role.findAll.mockResolvedValue(roles);
            await UserController.getAllRoles(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(responseSpy).toHaveBeenCalledWith(res, 200, true, expect.any(String), roles);
        });

        test('2. Return error jika database gagal', async () => {
            const error = new Error('Roles Error');
            Role.findAll.mockRejectedValue(error);
            await UserController.getAllRoles(req, res);
            expect(errorSpy).toHaveBeenCalledWith(res, error, expect.any(String));
        });
    });
});
