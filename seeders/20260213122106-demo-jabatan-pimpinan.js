'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('JabatanPimpinans', [
      { id_jabatan: 'J001', nama_jabatan: 'Walikota', createdAt: new Date(), updatedAt: new Date() },
      { id_jabatan: 'J002', nama_jabatan: 'Wakil Walikota', createdAt: new Date(), updatedAt: new Date() },
      { id_jabatan: 'J003', nama_jabatan: 'Sekretaris Daerah', createdAt: new Date(), updatedAt: new Date() },
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('JabatanPimpinans', null, {});
  }
};
