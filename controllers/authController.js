const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');
const { sendResponse } = require('../helpers/response');

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { nama, email, password, instansi, jabatan, alamat, no_hp } = req.body;

    // Validasi input
    if (!nama || !email || !password) {
      return sendResponse(res, 400, false, 'Nama, email, dan password wajib diisi');
    }

    // Cek email sudah terdaftar
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return sendResponse(res, 400, false, 'Email sudah terdaftar');
    }

    // Generate ID user
    const lastUser = await User.findOne({
      order: [['id_user', 'DESC']]
    });
    let newId = 'U001';
    if (lastUser) {
      const lastNum = parseInt(lastUser.id_user.substring(1));
      newId = 'U' + String(lastNum + 1).padStart(3, '0');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Buat user dengan role Pemohon (R008)
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

    return sendResponse(res, 201, true, 'Registrasi berhasil', userData);
  } catch (error) {
    console.error('Register error:', error);
    return sendResponse(res, 500, false, 'Terjadi kesalahan server');
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('[Backend] Login attempt:', { email, password });

    // Validasi input
    if (!email || !password) {
      return sendResponse(res, 400, false, 'Email dan password wajib diisi');
    }

    // Cari user berdasarkan email
    const user = await User.findOne({
      where: { email },
      include: [{
        model: Role,
        as: 'role',
        attributes: ['id_role', 'nama_role']
      }]
    });

    if (!user) {
      console.log('[Backend] User not found:', email);
      return sendResponse(res, 401, false, 'Email atau password salah');
    }

    // Cek status aktif
    if (user.status_aktif !== 'aktif') {
      return sendResponse(res, 403, false, 'Akun Anda tidak aktif, hubungi admin');
    }

    // Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('[Backend] Password check:', { isPasswordValid });
    
    if (!isPasswordValid) {
      return sendResponse(res, 401, false, 'Email atau password salah');
    }

    // Generate JWT token
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

    return sendResponse(res, 200, true, 'Login berhasil', { token, user: userData });
  } catch (error) {
    console.error('Login error:', error);
    return sendResponse(res, 500, false, 'Terjadi kesalahan server');
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
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
      return sendResponse(res, 404, false, 'User tidak ditemukan');
    }

    return sendResponse(res, 200, true, 'Data user berhasil diambil', user);
  } catch (error) {
    console.error('GetMe error:', error);
    return sendResponse(res, 500, false, 'Terjadi kesalahan server');
  }
};

module.exports = { register, login, getMe };
