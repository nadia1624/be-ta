'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('StatusAgenda', {
      id_status_agenda: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true
      },
      id_agenda: {
        type: Sequelize.STRING(10),
        allowNull: true,
        references: {
          model: 'Agenda',
          key: 'id_agenda'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_user_sespri: {
        type: Sequelize.STRING(10),
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id_user'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      status_agenda: {
        type: Sequelize.ENUM('pending', 'disetujui', 'ditolak'),
        defaultValue: 'pending'
      },
      tanggal_status: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      catatan: {
        type: Sequelize.TEXT,
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
    await queryInterface.addIndex('StatusAgenda', ['id_agenda'], {
      name: 'idx_status_agenda_agenda'
    });
    await queryInterface.addIndex('StatusAgenda', ['id_user_sespri'], {
      name: 'idx_status_agenda_sespri'
    });
    await queryInterface.addIndex('StatusAgenda', ['status_agenda'], {
      name: 'idx_status_agenda_status'
    });
    await queryInterface.addIndex('StatusAgenda', ['tanggal_status'], {
      name: 'idx_status_agenda_tanggal'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('StatusAgenda');
  }
};
