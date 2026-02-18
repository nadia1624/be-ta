'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PeriodePimpinans', {
      id_pimpinan: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'Pimpinans',
          key: 'id_pimpinan'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_periode: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'Periodes',
          key: 'id_periode'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_jabatan: {
        type: Sequelize.STRING(10),
        allowNull: true,
        references: {
          model: 'JabatanPimpinans',
          key: 'id_jabatan'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      status_aktif: {
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

    // Tambahkan indexes
    await queryInterface.addIndex('PeriodePimpinans', ['id_periode'], {
      name: 'idx_periode_pimpinan_periode'
    });
    await queryInterface.addIndex('PeriodePimpinans', ['status_aktif'], {
      name: 'idx_periode_pimpinan_status'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PeriodePimpinans');
  }
};  