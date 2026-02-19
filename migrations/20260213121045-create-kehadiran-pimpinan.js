'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('KehadiranPimpinans', {
      tanggal: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        primaryKey: true
      },
      id_slot_waktu: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true
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

    // Composite FK: (tanggal, id_slot_waktu) -> SlotAgendaPimpinans
    await queryInterface.addConstraint('KehadiranPimpinans', {
      fields: ['tanggal', 'id_slot_waktu'],
      type: 'foreign key',
      name: 'fk_kehadiran_slot_agenda',
      references: {
        table: 'SlotAgendaPimpinans',
        fields: ['tanggal', 'id_slot_waktu']
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });

    // Composite FK: (id_jabatan, id_periode) -> PeriodeJabatans
    await queryInterface.addConstraint('KehadiranPimpinans', {
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
    await queryInterface.addIndex('KehadiranPimpinans', ['id_jabatan'], {
      name: 'idx_kehadiran_jabatan'
    });
    await queryInterface.addIndex('KehadiranPimpinans', ['tanggal'], {
      name: 'idx_kehadiran_tanggal'
    });
    await queryInterface.addIndex('KehadiranPimpinans', ['kehadiran'], {
      name: 'idx_kehadiran_status'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('KehadiranPimpinans');
  }
};