'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('LaporanKegiatans', {
      id_laporan: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true
      },
      id_penugasan: {
        type: Sequelize.STRING(10),
        allowNull: true,
        references: {
          model: 'Penugasans',
          key: 'id_penugasan'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_user_staff: {
        type: Sequelize.STRING(10),
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id_user'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      deskripsi_laporan: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      catatan_laporan: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      dokumentasi_laporan: {
        type: Sequelize.STRING,
        allowNull: true
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
    await queryInterface.addIndex('LaporanKegiatans', ['id_penugasan'], {
      name: 'idx_laporan_kegiatans_penugasan'
    });
    await queryInterface.addIndex('LaporanKegiatans', ['id_user_staff'], {
      name: 'idx_laporan_kegiatans_staff'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('LaporanKegiatans');
  }
};
