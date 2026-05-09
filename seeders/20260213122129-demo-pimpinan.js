'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Pimpinans', [
      {
        id_pimpinan: 'P001',
        nama_pimpinan: 'H. Fadly Amran, BBA',
        nip: '197001011995031001',
        email: 'nadyadearihanifah@gmail.com',
        no_hp: '081300000001',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id_pimpinan: 'P002',
        nama_pimpinan: 'H. Maigus Nasir, M.Pd.',
        nip: '197203021996031002',
        email: 'kknbku2025@gmail.com',
        no_hp: '081300000002',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id_pimpinan: 'P003',
        nama_pimpinan: 'Raju Minropa, S.STP., M.Si',
        nip: '197505031997032003',
        email: 'zeezahdf@gmail.com',
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
