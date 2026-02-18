'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Periodes', [
      {
        id_periode: 'PD001',
        nama_periode: 'Periode 2024-2029',
        tanggal_mulai: '2024-01-01',
        tanggal_selesai: '2029-12-31',
        keterangan: 'Periode jabatan pimpinan tahun 2024 sampai 2029',
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
