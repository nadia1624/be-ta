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
        onDelete: 'CASCADE'
      },
      id_jabatan: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true
      },
      id_periode: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true
      },
      id_agenda: {
        type: Sequelize.STRING(10),
        allowNull: false,
        references: {
          model: 'Agenda',
          key: 'id_agenda'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      kehadiran: {
        type: Sequelize.ENUM('hadir', 'tidak_hadir'),
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



    // Composite FK: (id_jabatan, id_periode) -> PeriodeJabatans
    await queryInterface.addConstraint('SlotAgendaPimpinans', {
      fields: ['id_jabatan', 'id_periode'],
      type: 'foreign key',
      name: 'fk_kehadiran_periode_jabatan',
      references: {
        table: 'PeriodeJabatans',
        fields: ['id_jabatan', 'id_periode']
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    // Indexes
    await queryInterface.addIndex('SlotAgendaPimpinans', ['id_jabatan'], {
      name: 'idx_kehadiran_jabatan'
    });
    await queryInterface.addIndex('SlotAgendaPimpinans', ['tanggal'], {
      name: 'idx_kehadiran_tanggal'
    });
    await queryInterface.addIndex('SlotAgendaPimpinans', ['kehadiran'], {
      name: 'idx_kehadiran_status'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('SlotAgendaPimpinans');
  }
};