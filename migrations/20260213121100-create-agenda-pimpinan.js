'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AgendaPimpinans', {
      id_agenda: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'Agenda',
          key: 'id_agenda'
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
      status_kehadiran: {
        type: Sequelize.ENUM('hadir', 'tidak_hadir', 'diwakilkan'),
      },
      nama_perwakilan: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      keterangan: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      surat_disposisi: {
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

    // Composite FK: (id_jabatan, id_periode) -> PeriodeJabatans
    await queryInterface.addConstraint('AgendaPimpinans', {
      fields: ['id_jabatan', 'id_periode'],
      type: 'foreign key',
      name: 'fk_agenda_pimpinan_periode',
      references: {
        table: 'PeriodeJabatans',
        fields: ['id_jabatan', 'id_periode']
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    // Indexes
    await queryInterface.addIndex('AgendaPimpinans', ['id_jabatan'], {
      name: 'idx_agenda_pimpinans_jabatan'
    });
    await queryInterface.addIndex('AgendaPimpinans', ['id_periode'], {
      name: 'idx_agenda_pimpinans_periode'
    });
    await queryInterface.addIndex('AgendaPimpinans', ['status_kehadiran'], {
      name: 'idx_agenda_pimpinans_status'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('AgendaPimpinans');
  }
};
