'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Periodes', [
      {
        id_periode: 'PD001',
        nama_periode: 'Periode 2020-2025',
        tanggal_mulai: '2020-02-27',
        tanggal_selesai: '2025-02-27',
        keterangan: 'Periode jabatan Walikota dan Wakil Walikota tahun 2020 sampai 2024',
        status_periode: 'nonaktif',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id_periode: 'PD002',
        nama_periode: 'Periode 2025-2030',
        tanggal_mulai: '2025-02-27',
        tanggal_selesai: '2030-02-27',
        keterangan: 'Periode jabatan Walikota dan Wakil Walikota tahun 2025 sampai 2030',
        status_periode: 'aktif',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Periodes', null, {});
  }
};
