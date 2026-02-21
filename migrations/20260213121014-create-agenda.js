'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Agenda', {
      id_agenda: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true
      },
      id_user_pemohon: {
        type: Sequelize.STRING(10),
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id_user'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      nomor_surat: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      tanggal_surat: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      perihal: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      surat_permohonan: {
        type: Sequelize.STRING,
        allowNull: true
      },
      tanggal_pengajuan: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      tanggal_kegiatan: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      waktu_mulai: {
        type: Sequelize.TIME,
        allowNull: true
      },
      waktu_selesai: {
        type: Sequelize.TIME,
        allowNull: true
      },
      nama_kegiatan: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      lokasi_kegiatan: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      contact_person: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      keterangan: {
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

    // Tambahkan indexes
    await queryInterface.addIndex('Agenda', ['id_user_pemohon'], {
      name: 'idx_agenda_pemohon'
    });
    await queryInterface.addIndex('Agenda', ['tanggal_pengajuan'], {
      name: 'idx_agenda_tanggal_pengajuan'
    });
    await queryInterface.addIndex('Agenda', ['nomor_surat'], {
      name: 'idx_agenda_nomor_surat'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Agenda');
  }
};