'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Pimpinans', [
      {
        id_pimpinan: 'P001',
        nama_pimpinan: 'H. Andi Pratama, S.H., M.H.',
        nip: '197001011995031001',
        email: 'walikota@pemkot.go.id',
        no_hp: '081300000001',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id_pimpinan: 'P002',
        nama_pimpinan: 'Ir. Budi Santoso, M.T.',
        nip: '197203021996031002',
        email: 'wakilwalikota@pemkot.go.id',
        no_hp: '081300000002',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id_pimpinan: 'P003',
        nama_pimpinan: 'Dr. Citra Dewi, M.Si.',
        nip: '197505031997032003',
        email: 'sekda@pemkot.go.id',
        no_hp: '081300000003',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Pimpinans', null, {});
  }
};
