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
            return this.sendResponse(res, 200, true, 'User berhasil ditemukan', user);
        } catch (error) {
            return this.sendError(res, error, 'GetMe error');
        }
    }

    async updateProfile(req, res) {
        try {
            const id_user = req.user.id_user;
            const { nama, email, no_hp } = req.body;

            const user = await User.findByPk(id_user);
            if (!user) {
                return this.sendResponse(res, 404, false, 'User tidak ditemukan');
            }

            // Check if email is already taken by another user
            if (email && email !== user.email) {
                const existing = await User.findOne({ where: { email } });
                if (existing) {
                    return this.sendResponse(res, 400, false, 'Email sudah digunakan oleh akun lain');
                }
            }

            if (nama !== undefined) user.nama = nama;
            if (email !== undefined) user.email = email;
            if (no_hp !== undefined) user.no_hp = no_hp;

            await user.save();

            const updated = await User.findByPk(id_user, {
                attributes: { exclude: ['password'] },
                include: [{ model: Role, as: 'role', attributes: ['id_role', 'nama_role'] }]
            });

            return this.sendResponse(res, 200, true, 'Profil berhasil diperbarui', updated);
        } catch (error) {
            return this.sendError(res, error, 'UpdateProfile error');
        }
    }

    async changePassword(req, res) {
        try {
            const id_user = req.user.id_user;
            const { current_password, new_password } = req.body;

            if (!current_password || !new_password) {
                return this.sendResponse(res, 400, false, 'Password saat ini dan password baru wajib diisi');
            }

            if (new_password.length < 8) {
                return this.sendResponse(res, 400, false, 'Password baru minimal 8 karakter');
            }

            const user = await User.findByPk(id_user);
            if (!user) {
                return this.sendResponse(res, 404, false, 'User tidak ditemukan');
            }

            const isValid = await bcrypt.compare(current_password, user.password);
            if (!isValid) {
                return this.sendResponse(res, 400, false, 'Password saat ini tidak sesuai');
            }

            user.password = await bcrypt.hash(new_password, 10);
            await user.save();

            return this.sendResponse(res, 200, true, 'Password berhasil diubah');
        } catch (error) {
            return this.sendError(res, error, 'ChangePassword error');
        }
    }

    async uploadFoto(req, res) {
        try {
            if (!req.file) {
                return this.sendResponse(res, 400, false, 'Tidak ada file yang diunggah');
            }

            const id_user = req.user.id_user;
            const user = await User.findByPk(id_user);
            if (!user) {
                return this.sendResponse(res, 404, false, 'User tidak ditemukan');
            }

            // Delete old photo if exists
            if (user.foto_profil) {
                const fs = require('fs');
                const path = require('path');
                const oldPath = path.join(__dirname, '../uploads/profile', user.foto_profil.split('/').pop());
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }

            // Save new filename
            user.foto_profil = `/api/uploads/profile/${req.file.filename}`;
            await user.save();

            return this.sendResponse(res, 200, true, 'Foto profil berhasil diperbarui', {
                foto_profil: user.foto_profil
            });
        } catch (error) {
            return this.sendError(res, error, 'UploadFoto error');
        }
    }

    async deleteFoto(req, res) {
        try {
            const id_user = req.user.id_user;
            const user = await User.findByPk(id_user);
            if (!user) {
                return this.sendResponse(res, 404, false, 'User tidak ditemukan');
            }

            if (!user.foto_profil) {
                return this.sendResponse(res, 400, false, 'Tidak ada foto profil untuk dihapus');
            }

            // Delete file from disk
            const fs = require('fs');
            const path = require('path');
            const filePath = path.join(__dirname, '../uploads/profile', user.foto_profil.split('/').pop());
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            user.foto_profil = null;
            await user.save();

            return this.sendResponse(res, 200, true, 'Foto profil berhasil dihapus');
        } catch (error) {
            return this.sendError(res, error, 'DeleteFoto error');
        }
    }
}

module.exports = new AuthController();
