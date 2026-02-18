'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DraftBeritas', {
      id_draft_berita: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true
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
      id_user_staff: {
        type: Sequelize.STRING(10),
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id_user'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      judul_berita: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      isi_draft: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status_draft: {
        type: Sequelize.ENUM('draft', 'review', 'approved'),
        defaultValue: 'draft'
      },
      catatan: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      tanggal_kirim: {
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
    await queryInterface.addIndex('DraftBeritas', ['id_penugasan'], {
      name: 'idx_draft_beritas_penugasan'
    });
    await queryInterface.addIndex('DraftBeritas', ['id_user_staff'], {
      name: 'idx_draft_beritas_staff'
    });
    await queryInterface.addIndex('DraftBeritas', ['status_draft'], {
      name: 'idx_draft_beritas_status'
    });
    await queryInterface.addIndex('DraftBeritas', ['tanggal_kirim'], {
      name: 'idx_draft_beritas_tanggal'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('DraftBeritas');
  }
};
