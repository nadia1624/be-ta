'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('KASKPDs', [
      { id_ka_skpd: 'KS001', nama_instansi: 'Dinas Pendidikan', createdAt: new Date(), updatedAt: new Date() },
      { id_ka_skpd: 'KS002', nama_instansi: 'Dinas Kesehatan', createdAt: new Date(), updatedAt: new Date() },
      { id_ka_skpd: 'KS003', nama_instansi: 'Dinas Pekerjaan Umum', createdAt: new Date(), updatedAt: new Date() },
      { id_ka_skpd: 'KS004', nama_instansi: 'Dinas Perhubungan', createdAt: new Date(), updatedAt: new Date() },
      { id_ka_skpd: 'KS005', nama_instansi: 'Dinas Sosial', createdAt: new Date(), updatedAt: new Date() },
      { id_ka_skpd: 'KS006', nama_instansi: 'Dinas Lingkungan Hidup', createdAt: new Date(), updatedAt: new Date() },
      { id_ka_skpd: 'KS007', nama_instansi: 'Dinas Kependudukan dan Catatan Sipil', createdAt: new Date(), updatedAt: new Date() },
      { id_ka_skpd: 'KS008', nama_instansi: 'Dinas Komunikasi dan Informatika', createdAt: new Date(), updatedAt: new Date() },
      { id_ka_skpd: 'KS009', nama_instansi: 'Dinas Pariwisata', createdAt: new Date(), updatedAt: new Date() },
      { id_ka_skpd: 'KS010', nama_instansi: 'Dinas Perdagangan dan Perindustrian', createdAt: new Date(), updatedAt: new Date() },
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('KASKPDs', null, {});
  }
};
