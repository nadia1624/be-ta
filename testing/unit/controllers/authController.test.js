// Mock dependencies first (this is hoisted by Jest)
jest.mock('../../../models', () => {
    return {
        User: {
            findOne: jest.fn(),
            create: jest.fn(),
            findByPk: jest.fn(),
        },
        Role: {
            findOne: jest.fn(),
            findByPk: jest.fn(),
        }
    };
});
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('fs');
jest.mock('path');
jest.mock('crypto');
jest.mock('../../../helpers/emailHelper');

const AuthController = require('../../../controllers/AuthController');
const { User, Role } = require('../../../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailHelper = require('../../../helpers/emailHelper');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

describe('AuthController Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            user: { id_user: 'U001', id_role: 'R001', nama: 'Test User' },
            file: null
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
        
        // Default mocks
        path.join.mockImplementation((...args) => args.join('/'));
        crypto.randomBytes.mockReturnValue({ toString: () => 'mock_token' });
        crypto.createHash.mockReturnValue({
            update: jest.fn().mockReturnThis(),
            digest: jest.fn().mockReturnValue('mock_hash')
        });
    });

    describe('1. register()', () => {
        test('1. Return 400 jika nama/email/password kosong', async () => {
            req.body = { nama: 'Test' };
            await AuthController.register(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Nama, email, dan password wajib diisi' }));
        });

        test('2. Return 400 jika email sudah terdaftar (User.findOne return user)', async () => {
            req.body = { nama: 'T', email: 'e@t.com', password: 'p' };
            User.findOne.mockResolvedValue({ id_user: 'U1' });
            await AuthController.register(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Email sudah terdaftar' }));
        });

        test('3. Return 201 jika registrasi sukses tanpa lastUser (ID = U001)', async () => {
            req.body = { nama: 'T', email: 'e@t.com', password: 'p' };
            User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
            bcrypt.hash.mockResolvedValue('h');
            User.create.mockResolvedValue({ id_user: 'U001' });

            await AuthController.register(req, res);
            expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ id_user: 'U001' }));
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('4. Return 201 jika registrasi sukses dengan lastUser (ID increment, misal U005 → U006)', async () => {
            req.body = { nama: 'T', email: 'e@t.com', password: 'p' };
            User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id_user: 'U005' });
            User.create.mockResolvedValue({ id_user: 'U006' });

            await AuthController.register(req, res);
            expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ id_user: 'U006' }));
        });

        test('5. Pastikan bcrypt.hash dipanggil', async () => {
            req.body = { nama: 'T', email: 'e@t.com', password: 'plain_password' };
            User.findOne.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('hashed');
            User.create.mockResolvedValue({ id_user: 'U1' });

            await AuthController.register(req, res);
            expect(bcrypt.hash).toHaveBeenCalledWith('plain_password', 10);
        });

        test('6. Pastikan password yang disimpan bukan plain text', async () => {
            req.body = { nama: 'T', email: 'e@t.com', password: 'plain_password' };
            User.findOne.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('hashed_version');
            User.create.mockResolvedValue({ id_user: 'U1' });

            await AuthController.register(req, res);
            expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ password: 'hashed_version' }));
            expect(User.create).not.toHaveBeenCalledWith(expect.objectContaining({ password: 'plain_password' }));
        });

        test('7. Optional field (instansi, jabatan, dll) menjadi null jika tidak diisi', async () => {
            req.body = { nama: 'Test', email: 'm@t.com', password: 'p' };
            User.findOne.mockResolvedValue(null);
            User.create.mockResolvedValue({ id_user: 'U1' });

            await AuthController.register(req, res);
            expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
                instansi: null, jabatan: null, alamat: null, no_hp: null
            }));
        });

        test('8. Return error (sendError) jika User.create atau bcrypt gagal', async () => {
            req.body = { nama: 'T', email: 'e@t.com', password: 'p' };
            User.findOne.mockRejectedValue(new Error('Fatal'));
            await AuthController.register(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('2. login()', () => {
        test('1. Return 400 jika email/password kosong', async () => {
            await AuthController.login(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('2. Return 401 jika user tidak ditemukan', async () => {
            req.body = { email: 'e', password: 'p' };
            User.findOne.mockResolvedValue(null);
            await AuthController.login(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Email atau password salah' }));
        });

        test('3. Return 403 jika status user tidak aktif', async () => {
            req.body = { email: 'e', password: 'p' };
            User.findOne.mockResolvedValue({ status_aktif: 'nonaktif' });
            await AuthController.login(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Akun Anda tidak aktif, hubungi admin' }));
        });

        test('4. Return 401 jika password salah (bcrypt.compare false)', async () => {
            req.body = { email: 'e', password: 'p' };
            User.findOne.mockResolvedValue({ status_aktif: 'aktif', password: 'h' });
            bcrypt.compare.mockResolvedValue(false);
            await AuthController.login(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        test('5. Return 200 jika login sukses', async () => {
            req.body = { email: 'e', password: 'p' };
            User.findOne.mockResolvedValue({ status_aktif: 'aktif', role: { nama_role: 'A' } });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('token');

            await AuthController.login(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        test('6. Pastikan jwt.sign dipanggil', async () => {
            req.body = { email: 'e', password: 'p' };
            User.findOne.mockResolvedValue({ status_aktif: 'aktif', role: { nama_role: 'A' } });
            bcrypt.compare.mockResolvedValue(true);
            
            await AuthController.login(req, res);
            expect(jwt.sign).toHaveBeenCalled();
        });

        test('7. Pastikan response berisi token dan user data', async () => {
            req.body = { email: 'e', password: 'p' };
            User.findOne.mockResolvedValue({ id_user: 'U1', status_aktif: 'aktif', role: { nama_role: 'A' } });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('mock_token');

            await AuthController.login(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    token: 'mock_token',
                    user: expect.objectContaining({ id_user: 'U1' })
                })
            }));
        });

        test('8. Return error jika database error', async () => {
            req.body = { email: 'e', password: 'p' };
            User.findOne.mockRejectedValue(new Error());
            await AuthController.login(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('3. getMe()', () => {
        test('1. Return 200 jika user ditemukan', async () => {
            User.findByPk.mockResolvedValue({ id_user: 'U1' });
            await AuthController.getMe(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        test('2. Return 404 jika user tidak ditemukan', async () => {
            User.findByPk.mockResolvedValue(null);
            await AuthController.getMe(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('3. Pastikan password tidak ikut di response', async () => {
            User.findByPk.mockResolvedValue({ id_user: 'U1' });
            await AuthController.getMe(req, res);
            expect(User.findByPk).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
                attributes: { exclude: ['password'] }
            }));
        });

        test('4. Return error jika database error', async () => {
            User.findByPk.mockRejectedValue(new Error());
            await AuthController.getMe(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('4. updateProfile()', () => {
        test('1. Return 404 jika user tidak ditemukan', async () => {
            User.findByPk.mockResolvedValue(null);
            await AuthController.updateProfile(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('2. Return 400 jika email baru sudah digunakan user lain', async () => {
            User.findByPk.mockResolvedValue({ email: 'old@t.com' });
            User.findOne.mockResolvedValue({ id_user: 'U2' });
            req.body = { email: 'new@t.com' };
            await AuthController.updateProfile(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Email sudah digunakan oleh akun lain' }));
        });

        test('3. Update sukses jika hanya nama diubah (partial update)', async () => {
            const u = { nama: 'Old', save: jest.fn() };
            User.findByPk.mockResolvedValue(u);
            req.body = { nama: 'New Only' };
            await AuthController.updateProfile(req, res);
            expect(u.nama).toBe('New Only');
            expect(u.save).toHaveBeenCalled();
        });

        test('4. Update sukses jika semua field diubah', async () => {
            const u = { nama: 'O', email: 'o@t.com', no_hp: '1', save: jest.fn() };
            User.findByPk.mockResolvedValue(u);
            User.findOne.mockResolvedValue(null);
            req.body = { nama: 'N', email: 'n@t.com', no_hp: '2' };
            await AuthController.updateProfile(req, res);
            expect(u.nama).toBe('N');
            expect(u.email).toBe('n@t.com');
            expect(u.no_hp).toBe('2');
        });

        test('5. Jika email tidak berubah, tidak perlu cek duplicate', async () => {
            const u = { email: 's@t.com', save: jest.fn() };
            User.findByPk.mockResolvedValue(u);
            req.body = { email: 's@t.com', nama: 'Name' };
            User.findOne.mockClear();
            await AuthController.updateProfile(req, res);
            expect(User.findOne).not.toHaveBeenCalled();
        });

        test('6. Return 200 jika berhasil', async () => {
            const u = { email: 's', save: jest.fn() };
            User.findByPk.mockResolvedValue(u);
            req.body = { nama: 'N' };
            await AuthController.updateProfile(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('7. Return error jika terjadi exception', async () => {
            User.findByPk.mockRejectedValue(new Error());
            await AuthController.updateProfile(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });

        test('8. Success: Partial update with undefined fields', async () => {
            const u = { nama: 'Old', email: 's', save: jest.fn() };
            User.findByPk.mockResolvedValueOnce(u).mockResolvedValueOnce(u);
            req.body = { email: 'new@test.com' }; // nama and no_hp are undefined
            await AuthController.updateProfile(req, res);
            expect(u.nama).toBe('Old');
            expect(u.email).toBe('new@test.com');
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('5. changePassword()', () => {
        test('1. Return 400 jika field kosong', async () => {
            await AuthController.changePassword(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('2. Return 400 jika password baru < 8 karakter', async () => {
            req.body = { current_password: 'o', new_password: 'short' };
            await AuthController.changePassword(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('3. Return 404 jika user tidak ditemukan', async () => {
            req.body = { current_password: 'o', new_password: 'validpassword' };
            User.findByPk.mockResolvedValue(null);
            await AuthController.changePassword(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('4. Return 400 jika password lama salah', async () => {
            req.body = { current_password: 'w', new_password: 'validpassword' };
            User.findByPk.mockResolvedValue({ password: 'h' });
            bcrypt.compare.mockResolvedValue(false);
            await AuthController.changePassword(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('5. Return 200 jika berhasil', async () => {
            req.body = { current_password: 'o', new_password: 'new_valid_password' };
            const u = { password: 'o', save: jest.fn() };
            User.findByPk.mockResolvedValue(u);
            bcrypt.compare.mockResolvedValue(true);
            bcrypt.hash.mockResolvedValue('h');
            await AuthController.changePassword(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        test('6. Pastikan bcrypt.hash dipanggil untuk password baru', async () => {
            req.body = { current_password: 'o', new_password: 'new_valid_password' };
            User.findByPk.mockResolvedValue({ password: 'o', save: jest.fn() });
            bcrypt.compare.mockResolvedValue(true);
            bcrypt.hash.mockResolvedValue('new_h');

            await AuthController.changePassword(req, res);
            expect(bcrypt.hash).toHaveBeenCalledWith('new_valid_password', 10);
        });

        test('7. Pastikan password berubah', async () => {
            req.body = { current_password: 'o', new_password: 'new_valid_password' };
            const u = { password: 'old', save: jest.fn() };
            User.findByPk.mockResolvedValue(u);
            bcrypt.compare.mockResolvedValue(true);
            bcrypt.hash.mockResolvedValue('new_hashed_password');

            await AuthController.changePassword(req, res);
            expect(u.password).toBe('new_hashed_password');
        });

        test('8. Return error jika gagal', async () => {
            req.body = { current_password: 'o', new_password: 'validpassword' };
            User.findByPk.mockRejectedValue(new Error());
            await AuthController.changePassword(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('6. uploadFoto()', () => {
        test('1. Return 400 jika tidak ada file (req.file null)', async () => {
            await AuthController.uploadFoto(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('2. Return 404 jika user tidak ditemukan', async () => {
            req.file = { filename: 'p.jpg' };
            User.findByPk.mockResolvedValue(null);
            await AuthController.uploadFoto(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('3. Upload sukses tanpa foto lama', async () => {
            req.file = { filename: 'n.jpg' };
            const u = { foto_profil: null, save: jest.fn() };
            User.findByPk.mockResolvedValue(u);
            await AuthController.uploadFoto(req, res);
            expect(u.foto_profil).toContain('n.jpg');
        });

        test('4. Upload sukses dengan foto lama → pastikan fs.unlinkSync dipanggil', async () => {
            req.file = { filename: 'n.jpg' };
            const u = { foto_profil: '/o.jpg', save: jest.fn() };
            User.findByPk.mockResolvedValue(u);
            fs.existsSync.mockReturnValue(true);
            await AuthController.uploadFoto(req, res);
            expect(fs.unlinkSync).toHaveBeenCalled();
        });

        test('5. Jika file lama tidak ada (fs.existsSync false), tetap sukses', async () => {
            req.file = { filename: 'n.jpg' };
            const u = { foto_profil: '/missing.jpg', save: jest.fn() };
            User.findByPk.mockResolvedValue(u);
            fs.existsSync.mockReturnValue(false);
            await AuthController.uploadFoto(req, res);
            expect(fs.unlinkSync).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('6. Return 200 jika berhasil', async () => {
            req.file = { filename: 'n.jpg' };
            User.findByPk.mockResolvedValue({ foto_profil: null, save: jest.fn() });
            await AuthController.uploadFoto(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('7. Return error jika terjadi exception', async () => {
            req.file = { filename: 'p.jpg' };
            User.findByPk.mockRejectedValue(new Error());
            await AuthController.uploadFoto(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('7. deleteFoto()', () => {
        test('1. Return 404 jika user tidak ditemukan', async () => {
            User.findByPk.mockResolvedValue(null);
            await AuthController.deleteFoto(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('2. Return 400 jika user tidak punya foto', async () => {
            User.findByPk.mockResolvedValue({ foto_profil: null });
            await AuthController.deleteFoto(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('3. Hapus foto berhasil (fs.unlinkSync dipanggil)', async () => {
            const u = { foto_profil: '/p.jpg', save: jest.fn() };
            User.findByPk.mockResolvedValue(u);
            fs.existsSync.mockReturnValue(true);
            await AuthController.deleteFoto(req, res);
            expect(fs.unlinkSync).toHaveBeenCalled();
        });

        test('4. Jika file tidak ada di disk, tetap sukses', async () => {
            const u = { foto_profil: '/missing.jpg', save: jest.fn() };
            User.findByPk.mockResolvedValue(u);
            fs.existsSync.mockReturnValue(false);
            await AuthController.deleteFoto(req, res);
            expect(fs.unlinkSync).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('5. Return 200 jika berhasil', async () => {
            User.findByPk.mockResolvedValue({ foto_profil: '/p.jpg', save: jest.fn() });
            fs.existsSync.mockReturnValue(true);
            await AuthController.deleteFoto(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('6. Return error jika terjadi exception', async () => {
            User.findByPk.mockRejectedValue(new Error());
            await AuthController.deleteFoto(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('8. forgotPassword()', () => {
        test('1. Return 400 jika email kosong', async () => {
            await AuthController.forgotPassword(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('2. Return 404 jika user tidak ditemukan', async () => {
            req.body = { email: 'e' };
            User.findOne.mockResolvedValue(null);
            await AuthController.forgotPassword(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('3. Generate reset token (crypto.randomBytes dipanggil)', async () => {
            req.body = { email: 'u@t.com' };
            User.findOne.mockResolvedValue({ save: jest.fn() });
            emailHelper.sendPasswordResetEmail.mockResolvedValue(true);
            await AuthController.forgotPassword(req, res);
            expect(crypto.randomBytes).toHaveBeenCalled();
        });

        test('4. Simpan resetPasswordToken dan resetPasswordExpires', async () => {
            req.body = { email: 'u@t.com' };
            const u = { save: jest.fn() };
            User.findOne.mockResolvedValue(u);
            emailHelper.sendPasswordResetEmail.mockResolvedValue(true);
            
            await AuthController.forgotPassword(req, res);
            expect(u.resetPasswordToken).toBeDefined();
            expect(u.resetPasswordExpires).toBeDefined();
        });

        test('5. Kirim email berhasil → return 200', async () => {
            req.body = { email: 'u@t.com' };
            User.findOne.mockResolvedValue({ save: jest.fn() });
            emailHelper.sendPasswordResetEmail.mockResolvedValue(true);
            await AuthController.forgotPassword(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('6. Jika email gagal dikirim: cleanup resetPasswordToken/expiry', async () => {
            req.body = { email: 'u@t.com' };
            const u = { save: jest.fn() };
            User.findOne.mockResolvedValue(u);
            emailHelper.sendPasswordResetEmail.mockRejectedValue(new Error());
            await AuthController.forgotPassword(req, res);
            expect(u.resetPasswordToken).toBeNull();
            expect(u.resetPasswordExpires).toBeNull();
            expect(res.status).toHaveBeenCalledWith(500);
        });

        test('7. Return error jika terjadi exception', async () => {
            req.body = { email: 'e' };
            User.findOne.mockRejectedValue(new Error());
            await AuthController.forgotPassword(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('9. resetPassword()', () => {
        test('1. Return 400 jika password < 8 karakter', async () => {
            req.body = { password: 'short' };
            await AuthController.resetPassword(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('2. Return 400 jika token tidak valid', async () => {
            req.body = { password: 'validpassword' };
            req.params = { token: 't' };
            User.findOne.mockResolvedValue(null);
            await AuthController.resetPassword(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Token tidak valid atau sudah kadaluarsa' }));
        });

        test('3. Return 400 jika token expired', async () => {
            req.body = { password: 'validpassword' };
            req.params = { token: 't' };
            User.findOne.mockResolvedValue(null); // Simulate Op.gt check fail
            await AuthController.resetPassword(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('4. Return 200 jika berhasil reset password', async () => {
            req.body = { password: 'new_valid_password' };
            req.params = { token: 'tok' };
            const u = { save: jest.fn() };
            User.findOne.mockResolvedValue(u);
            bcrypt.hash.mockResolvedValue('h');
            await AuthController.resetPassword(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        test('5. Pastikan bcrypt.hash dipanggil', async () => {
            req.body = { password: 'new_valid_password' };
            req.params = { token: 't' };
            User.findOne.mockResolvedValue({ save: jest.fn() });
            bcrypt.hash.mockResolvedValue('h');
            await AuthController.resetPassword(req, res);
            expect(bcrypt.hash).toHaveBeenCalled();
        });

        test('6. Pastikan token dan expiry dihapus setelah reset', async () => {
            req.body = { password: 'new_valid_password' };
            req.params = { token: 't' };
            const u = { save: jest.fn(), resetPasswordToken: 't', resetPasswordExpires: 'e' };
            User.findOne.mockResolvedValue(u);
            bcrypt.hash.mockResolvedValue('h');
            await AuthController.resetPassword(req, res);
            expect(u.resetPasswordToken).toBeNull();
            expect(u.resetPasswordExpires).toBeNull();
        });

        test('7. Return error jika terjadi exception', async () => {
            req.body = { password: 'validpassword' };
            req.params = { token: 't' };
            User.findOne.mockRejectedValue(new Error());
            await AuthController.resetPassword(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
