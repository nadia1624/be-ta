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
      id_jabatan_hadir: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true
      },
      id_periode_hadir: {
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
      id_jabatan_diusulkan: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      id_periode_diusulkan: {
        type: Sequelize.STRING(10),
        allowNull: true
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

    await queryInterface.addConstraint('SlotAgendaPimpinans', {
      fields: ['id_jabatan_hadir', 'id_periode_hadir'],
      type: 'foreign key',
      name: 'fk_slot_agenda_periode_hadir',
      references: {
        table: 'PeriodeJabatans',
        fields: ['id_jabatan', 'id_periode']
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.addConstraint('SlotAgendaPimpinans', {
      fields: ['id_jabatan_diusulkan', 'id_periode_diusulkan'],
      type: 'foreign key',
      name: 'fk_slot_agenda_periode_diusulkan',
      references: {
        table: 'PeriodeJabatans',
        fields: ['id_jabatan', 'id_periode']
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addConstraint('SlotAgendaPimpinans', {
      fields: ['id_agenda', 'id_jabatan_diusulkan', 'id_periode_diusulkan'],
      type: 'unique',
      name: 'uq_slot_agenda_diusulkan'
    });

    await queryInterface.addIndex('SlotAgendaPimpinans', ['id_jabatan_hadir'], {
      name: 'idx_slot_agenda_jabatan_hadir'
    });
    await queryInterface.addIndex('SlotAgendaPimpinans', ['tanggal'], {
      name: 'idx_slot_agenda_tanggal'
    });
    await queryInterface.addIndex('SlotAgendaPimpinans', ['kehadiran'], {
      name: 'idx_slot_agenda_kehadiran'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('SlotAgendaPimpinans');
  }
};
