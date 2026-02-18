'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SlotAgendaPimpinans', {
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
        onDelete: 'RESTRICT'
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
    await queryInterface.addIndex('SlotAgendaPimpinans', ['id_agenda'], {
      name: 'idx_slot_agenda_pimpinans_agenda'
    });
    await queryInterface.addIndex('SlotAgendaPimpinans', ['tanggal'], {
      name: 'idx_slot_agenda_pimpinans_tanggal'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('SlotAgendaPimpinans');
  }
};
