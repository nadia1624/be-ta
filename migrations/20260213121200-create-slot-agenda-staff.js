'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SlotAgendaStaffs', {
      tanggal: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        primaryKey: true
      },
      id_slot_waktu: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'SlotWaktus',
          key: 'id_slot_waktu'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_user_staff: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'Users',
          key: 'id_user'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
      kehadiran: {
        type: Sequelize.ENUM('hadir', 'tidak_hadir', 'izin'),
        defaultValue: 'hadir'
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

    // Indexes
    await queryInterface.addIndex('SlotAgendaStaffs', ['id_user_staff'], {
      name: 'idx_slot_agenda_staffs_staff'
    });
    await queryInterface.addIndex('SlotAgendaStaffs', ['tanggal'], {
      name: 'idx_slot_agenda_staffs_tanggal'
    });
    await queryInterface.addIndex('SlotAgendaStaffs', ['id_penugasan'], {
      name: 'idx_slot_agenda_staffs_penugasan'
    });
    await queryInterface.addIndex('SlotAgendaStaffs', ['kehadiran'], {
      name: 'idx_slot_agenda_staffs_kehadiran'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('SlotAgendaStaffs');
  }
};
