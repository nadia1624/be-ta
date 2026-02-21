const BaseController = require('./BaseController');
const { User, Role, PimpinanAjudan, PeriodeJabatan, Pimpinan, Periode } = require('../models');
const bcrypt = require('bcryptjs');

class UserController extends BaseController {
    /**
     * Helper to generate User ID
     */
    async generateUserId() {
        const lastUser = await User.findOne({ 
            order: [['id_user', 'DESC']],
            attributes: ['id_user']
        });
        
        let nextNum = 1;
        if (lastUser && lastUser.id_user.startsWith('U')) {
            const num = parseInt(lastUser.id_user.substring(1));
            if (!isNaN(num)) nextNum = num + 1;
        }
        
        return `U${nextNum.toString().padStart(3, '0')}`;
    }

    async getAllUsers(req, res) {
        try {
            const users = await User.findAll({
                attributes: { exclude: ['password'] },
                include: [
                    { model: Role, as: 'role' },
                    { 
                        model: PimpinanAjudan, 
                        as: 'pimpinanAjudans',
                        include: [
                            {
                                model: PeriodeJabatan,
                                as: 'periodeJabatan',
                                include: [
                                    { model: Pimpinan, as: 'pimpinan' },
                                    { model: Periode, as: 'periode' }
                                ]
                            }
                        ]
                    }
                ],
                order: [['nama', 'ASC']]
            });
            return this.sendResponse(res, 200, true, 'Data users berhasil diambil', users);
        } catch (error) {
            return this.sendError(res, error, 'Error fetching users');
        }
    }

    async createUser(req, res) {
        try {
            const { 
                nama, email, password, role_id, nip, no_hp, 
                status_aktif, instansi, alamat, jabatan,
                id_jabatan_ajudan, id_periode_ajudan, keterangan_ajudan 
            } = req.body;

            // Validations
            const existingEmail = await User.findOne({ where: { email } });
            if (existingEmail) return this.sendResponse(res, 400, false, 'Email sudah terdaftar');

            if (nip) {
                const existingNip = await User.findOne({ where: { nip } });
                if (existingNip) return this.sendResponse(res, 400, false, 'NIP sudah terdaftar');
            }

            const id_user = await this.generateUserId();
            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser = await User.create({
                id_user,
                nama,
                email,
                password: hashedPassword,
                id_role: role_id,
                nip,
                no_hp,
                status_aktif: status_aktif || 'aktif',
                instansi,
                alamat,
                jabatan
            });

            const role = await Role.findByPk(role_id);
            if (role && role.nama_role.toLowerCase() === 'ajudan') {
                if (id_jabatan_ajudan && id_periode_ajudan) {
                    await PimpinanAjudan.create({
                        id_user_ajudan: newUser.id_user,
                        id_jabatan: id_jabatan_ajudan,
                        id_periode: id_periode_ajudan,
                        keterangan: keterangan_ajudan || 'Assignment Ajudan'
                    });
                }
            }

            return this.sendResponse(res, 201, true, 'User berhasil dibuat', newUser);
        } catch (error) {
            return this.sendError(res, error, 'Error creating user');
        }
    }

    async updateUser(req, res) {
        try {
            const { id } = req.params; 
            const id_user = id || req.body.id_user;
            
            const { 
                nama, email, password, role_id, nip, no_hp, 
                status_aktif, instansi, alamat, jabatan,
                id_jabatan_ajudan, id_periode_ajudan 
            } = req.body;

            const user = await User.findByPk(id_user);
            if (!user) return this.sendResponse(res, 404, false, 'User tidak ditemukan');

            // Update fields
            user.nama = nama;
            user.email = email;
            user.id_role = role_id;
            user.nip = nip;
            user.no_hp = no_hp;
            user.status_aktif = status_aktif;
            user.instansi = instansi;
            user.alamat = alamat;
            user.jabatan = jabatan;

            if (password && password.trim() !== '') {
                user.password = await bcrypt.hash(password, 10);
            }

            await user.save();

            // Handle Role specific logic
            const role = await Role.findByPk(role_id);
            
            if (role && role.nama_role.toLowerCase() === 'ajudan') {
                 if (id_jabatan_ajudan && id_periode_ajudan) {
                     const existingAssignment = await PimpinanAjudan.findOne({
                         where: { id_user_ajudan: id_user }
                     });

                     if (existingAssignment) {
                         await existingAssignment.destroy();
                     }

                     await PimpinanAjudan.create({
                        id_user_ajudan: id_user,
                        id_jabatan: id_jabatan_ajudan,
                        id_periode: id_periode_ajudan,
                        keterangan: 'Assignment Ajudan Update'
                    });
                 }
            } else {
                await PimpinanAjudan.destroy({ where: { id_user_ajudan: id_user } });
            }

            return this.sendResponse(res, 200, true, 'User berhasil diupdate');
        } catch (error) {
            return this.sendError(res, error, 'Error updating user');
        }
    }

    async deleteUser(req, res) {
        try {
            const { id_user } = req.body;
            
            await PimpinanAjudan.destroy({ where: { id_user_ajudan: id_user } });

            const deleted = await User.destroy({ where: { id_user } });
            
            if (deleted) {
                return this.sendResponse(res, 200, true, 'User berhasil dihapus');
            } else {
                return this.sendResponse(res, 404, false, 'User tidak ditemukan');
            }
        } catch (error) {
            return this.sendError(res, error, 'Error deleting user');
        }
    }

    async getAllRoles(req, res) {
        try {
            const roles = await Role.findAll();
            return this.sendResponse(res, 200, true, 'Data roles berhasil diambil', roles);
        } catch (error) {
            return this.sendError(res, error, 'Error fetching roles');
        }
    }
}

module.exports = new UserController();
