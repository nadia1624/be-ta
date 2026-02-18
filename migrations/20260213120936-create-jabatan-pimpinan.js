'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('JabatanPimpinans', {
      id_jabatan: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true
      },
      nama_jabatan: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('JabatanPimpinans', ['nama_jabatan'], {
      name: 'idx_jabatan_pimpinans_nama'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('JabatanPimpinans');
  }
};
