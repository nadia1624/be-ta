'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('KASKPDs', {
      id_ka_skpd: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true
      },
      nama_instansi: {
        type: Sequelize.STRING(50),
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
    await queryInterface.addIndex('KASKPDs', ['nama_instansi'], {
      name: 'idx_kaskpds_instansi'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('KASKPDs');
  }
};
