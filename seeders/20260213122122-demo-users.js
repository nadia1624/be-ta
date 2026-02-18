'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('password123', 10);

    await queryInterface.bulkInsert('Users', [
      // Admin
      {
        id_user: 'U001',
        id_role: 'R001',
        nama: 'Admin Sistem',
        nip: '199001012020011001',
        email: 'admin@pemkot.go.id',
        password: hashedPassword,
        instansi: 'Bagian Protokol dan Komunikasi Pimpinan',
        alamat: 'Jl. Balai Kota No. 1',
        no_hp: '081200000001',
        status_aktif: 'aktif',
        foto_profil: null,
        jabatan: 'Administrator',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Sespri
      {
        id_user: 'U002',
        id_role: 'R002',
        nama: 'Sespri Walikota',
        nip: '199102022020012002',
        email: 'sespri@pemkot.go.id',
        password: hashedPassword,
        instansi: 'Bagian Protokol dan Komunikasi Pimpinan',
        alamat: 'Jl. Balai Kota No. 1',
        no_hp: '081200000002',
        status_aktif: 'aktif',
        foto_profil: null,
        jabatan: 'Sekretaris Pribadi',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Kasubag Media
      {
        id_user: 'U003',
        id_role: 'R003',
        nama: 'Kasubag Media',
        nip: '198803032019011003',
        email: 'kasubagmedia@pemkot.go.id',
        password: hashedPassword,
        instansi: 'Bagian Protokol dan Komunikasi Pimpinan',
        alamat: 'Jl. Balai Kota No. 1',
        no_hp: '081200000003',
        status_aktif: 'aktif',
        foto_profil: null,
        jabatan: 'Kepala Sub Bagian Media',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Kasubag Protokol
      {
        id_user: 'U004',
        id_role: 'R004',
        nama: 'Kasubag Protokol',
        nip: '198704042019011004',
        email: 'kasubagprotokol@pemkot.go.id',
        password: hashedPassword,
        instansi: 'Bagian Protokol dan Komunikasi Pimpinan',
        alamat: 'Jl. Balai Kota No. 1',
        no_hp: '081200000004',
        status_aktif: 'aktif',
        foto_profil: null,
        jabatan: 'Kepala Sub Bagian Protokol',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Ajudan
      {
        id_user: 'U005',
        id_role: 'R005',
        nama: 'Ajudan Walikota',
        nip: '199505052021011005',
        email: 'ajudan@pemkot.go.id',
        password: hashedPassword,
        instansi: 'Bagian Protokol dan Komunikasi Pimpinan',
        alamat: 'Jl. Balai Kota No. 1',
        no_hp: '081200000005',
        status_aktif: 'aktif',
        foto_profil: null,
        jabatan: 'Ajudan',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Staff Media
      {
        id_user: 'U006',
        id_role: 'R006',
        nama: 'Staff Media 1',
        nip: '199606062022011006',
        email: 'staffmedia1@pemkot.go.id',
        password: hashedPassword,
        instansi: 'Bagian Protokol dan Komunikasi Pimpinan',
        alamat: 'Jl. Balai Kota No. 1',
        no_hp: '081200000006',
        status_aktif: 'aktif',
        foto_profil: null,
        jabatan: 'Staff Media',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Staff Protokol
      {
        id_user: 'U007',
        id_role: 'R007',
        nama: 'Staff Protokol 1',
        nip: '199707072022011007',
        email: 'staffprotokol1@pemkot.go.id',
        password: hashedPassword,
        instansi: 'Bagian Protokol dan Komunikasi Pimpinan',
        alamat: 'Jl. Balai Kota No. 1',
        no_hp: '081200000007',
        status_aktif: 'aktif',
        foto_profil: null,
        jabatan: 'Staff Protokol',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Pemohon
      {
        id_user: 'U008',
        id_role: 'R008',
        nama: 'Pemohon Demo',
        nip: null,
        email: 'pemohon@example.com',
        password: hashedPassword,
        instansi: 'Dinas Pendidikan',
        alamat: 'Jl. Pendidikan No. 10',
        no_hp: '081200000008',
        status_aktif: 'aktif',
        foto_profil: null,
        jabatan: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', null, {});
  }
};
