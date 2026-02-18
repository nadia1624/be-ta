'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Periodes', {
      id_periode: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true
      },
      nama_periode: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      tanggal_mulai: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      tanggal_selesai: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      keterangan: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status_periode: {
        type: Sequelize.ENUM('aktif', 'nonaktif'),
        defaultValue: 'aktif'
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
    await queryInterface.addIndex('Periodes', ['status_periode'], {
      name: 'idx_periodes_status'
    });
    await queryInterface.addIndex('Periodes', ['tanggal_mulai', 'tanggal_selesai'], {
      name: 'idx_periodes_tanggal'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Periodes');
  }
};
