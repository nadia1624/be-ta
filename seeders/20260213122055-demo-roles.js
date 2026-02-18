'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Roles', [
      { id_role: 'R001', nama_role: 'Admin', createdAt: new Date(), updatedAt: new Date() },
      { id_role: 'R002', nama_role: 'Sespri', createdAt: new Date(), updatedAt: new Date() },
      { id_role: 'R003', nama_role: 'Kasubag Media', createdAt: new Date(), updatedAt: new Date() },
      { id_role: 'R004', nama_role: 'Kasubag Protokol', createdAt: new Date(), updatedAt: new Date() },
      { id_role: 'R005', nama_role: 'Ajudan', createdAt: new Date(), updatedAt: new Date() },
      { id_role: 'R006', nama_role: 'Staff Media', createdAt: new Date(), updatedAt: new Date() },
      { id_role: 'R007', nama_role: 'Staff Protokol', createdAt: new Date(), updatedAt: new Date() },
      { id_role: 'R008', nama_role: 'Pemohon', createdAt: new Date(), updatedAt: new Date() },
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Roles', null, {});
  }
};
