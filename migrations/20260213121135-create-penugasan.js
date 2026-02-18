'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Penugasans', {
      id_penugasan: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true
      },
      id_user_kasubag: {
        type: Sequelize.STRING(10),
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id_user'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      jenis_penugasan: {
        type: Sequelize.ENUM('protokol', 'media'),
        allowNull: true
      },
      deskripsi_penugasan: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      tanggal_penugasan: {
        type: Sequelize.DATEONLY,
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
    await queryInterface.addIndex('Penugasans', ['id_user_kasubag'], {
      name: 'idx_penugasans_kasubag'
    });
    await queryInterface.addIndex('Penugasans', ['tanggal_penugasan'], {
      name: 'idx_penugasans_tanggal'
    });
    await queryInterface.addIndex('Penugasans', ['jenis_penugasan'], {
      name: 'idx_penugasans_jenis'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Penugasans');
  }
};
