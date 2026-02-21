const BaseController = require('./BaseController');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');

class AuthController extends BaseController {
    async register(req, res) {
        try {
            const { nama, email, password, instansi, jabatan, alamat, no_hp } = req.body;

            if (!nama || !email || !password) {
                return this.sendResponse(res, 400, false, 'Nama, email, dan password wajib diisi');
            }

            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return this.sendResponse(res, 400, false, 'Email sudah terdaftar');
            }

            // Generate ID user (lexicographical sort)
            const lastUser = await User.findOne({
                order: [['id_user', 'DESC']]
            });
            let newId = 'U001';
            if (lastUser) {
                const lastNum = parseInt(lastUser.id_user.substring(1));
                newId = 'U' + String(lastNum + 1).padStart(3, '0');
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await User.create({
                id_user: newId,
                id_role: 'R008',
                nama,
                email,
                password: hashedPassword,
                instansi: instansi || null,
                jabatan: jabatan || null,
                alamat: alamat || null,
                no_hp: no_hp || null,
                status_aktif: 'aktif'
            });

            const userData = {
                id_user: user.id_user,
                nama: user.nama,
                email: user.email
            };

            return this.sendResponse(res, 201, true, 'Registrasi berhasil', userData);
        } catch (error) {
            return this.sendError(res, error, 'Register error');
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;
            console.log('[Backend] Login attempt:', { email });

            if (!email || !password) {
                return this.sendResponse(res, 400, false, 'Email dan password wajib diisi');
            }

            const user = await User.findOne({
                where: { email },
                include: [{
                    model: Role,
                    as: 'role',
                    attributes: ['id_role', 'nama_role']
                }]
            });

            if (!user) {
                return this.sendResponse(res, 401, false, 'Email atau password salah');
            }

            if (user.status_aktif !== 'aktif') {
                return this.sendResponse(res, 403, false, 'Akun Anda tidak aktif, hubungi admin');
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            
            if (!isPasswordValid) {
                return this.sendResponse(res, 401, false, 'Email atau password salah');
            }

            const tokenPayload = {
                id_user: user.id_user,
                id_role: user.id_role,
                nama: user.nama,
                nama_role: user.role.nama_role
            };

            const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRES_IN || '24h'
            });

            const userData = {
                id_user: user.id_user,
                nama: user.nama,
                email: user.email,
                role: user.role
            };

            return this.sendResponse(res, 200, true, 'Login berhasil', { token, user: userData });
        } catch (error) {
            return this.sendError(res, error, 'Login error');
        }
    }

    async getMe(req, res) {
        try {
            const user = await User.findByPk(req.user.id_user, {
                attributes: { exclude: ['password'] },
                include: [{
                    model: Role,
                    as: 'role',
                    attributes: ['id_role', 'nama_role']
                }]
            });

            if (!user) {
                return this.sendResponse(res, 404, false, 'User tidak ditemukan');
            }

            return this.sendResponse(res, 200, true, 'Data user berhasil diambil', user);
        } catch (error) {
            return this.sendError(res, error, 'GetMe error');
        }
    }
}

module.exports = new AuthController();
