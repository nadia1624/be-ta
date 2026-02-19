const { User, Role, PimpinanAjudan, PeriodePimpinan, Pimpinan, Periode } = require('../models');
const bcrypt = require('bcryptjs');

// Helper to generate User ID
const generateUserId = async (roleName) => {

    const lastUser = await User.findOne({ 
        order: [['createdAt', 'DESC']],
        attributes: ['id_user']
    });
    
    let nextNum = 1;
    if (lastUser && lastUser.id_user.startsWith('U')) {
        const num = parseInt(lastUser.id_user.substring(1));
        if (!isNaN(num)) nextNum = num + 1;
    }
    
    return `U${nextNum.toString().padStart(3, '0')}`;
};

exports.getAllUsers = async (req, res) => {
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
                            model: PeriodePimpinan,
                            as: 'periodePimpinan',
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
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { 
            nama, email, password, role_id, nip, no_hp, 
            status_aktif, instansi, alamat, jabatan,
            id_pimpinan_ajudan, id_periode_ajudan, keterangan_ajudan // For Ajudan role
        } = req.body;

        // Validations
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });

        if (nip) {
            const existingNip = await User.findOne({ where: { nip } });
            if (existingNip) return res.status(400).json({ success: false, message: 'NIP sudah terdaftar' });
        }

        const id_user = await generateUserId();
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
            if (id_pimpinan_ajudan && id_periode_ajudan) {
                await PimpinanAjudan.create({
                    id_user_ajudan: newUser.id_user,
                    id_pimpinan: id_pimpinan_ajudan,
                    id_periode: id_periode_ajudan,
                    keterangan: keterangan_ajudan || 'Assignment Ajudan'
                });
            }
        }

        res.status(201).json({ 
            success: true, 
            message: 'User berhasil dibuat', 
            data: newUser 
        });

    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params; 
        const id_user = id || req.body.id_user;
        
        const { 
            nama, email, password, role_id, nip, no_hp, 
            status_aktif, instansi, alamat, jabatan,
            id_pimpinan_ajudan, id_periode_ajudan // For Ajudan role
        } = req.body;

        const user = await User.findByPk(id_user);
        if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

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
             // Upsert PimpinanAjudan
             if (id_pimpinan_ajudan && id_periode_ajudan) {
                 const existingAssignment = await PimpinanAjudan.findOne({
                     where: { id_user_ajudan: id_user }
                 });

                 if (existingAssignment) {
                     await existingAssignment.destroy();
                 }

                 await PimpinanAjudan.create({
                    id_user_ajudan: id_user,
                    id_pimpinan: id_pimpinan_ajudan,
                    id_periode: id_periode_ajudan,
                    keterangan: 'Assignment Ajudan Update'
                });
             }
        } else {
            await PimpinanAjudan.destroy({ where: { id_user_ajudan: id_user } });
        }

        res.status(200).json({ success: true, message: 'User berhasil diupdate' });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id_user } = req.body;
        
        await PimpinanAjudan.destroy({ where: { id_user_ajudan: id_user } });

        const deleted = await User.destroy({ where: { id_user } });
        
        if (deleted) {
            res.status(200).json({ success: true, message: 'User berhasil dihapus' });
        } else {
            res.status(404).json({ success: false, message: 'User tidak ditemukan' });
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllRoles = async (req, res) => {
    try {
        const roles = await Role.findAll();
        res.status(200).json({ success: true, data: roles });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}
