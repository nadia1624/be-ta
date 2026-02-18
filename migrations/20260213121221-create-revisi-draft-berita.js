'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('RevisiDraftBeritas', {
      id_revisi: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true
      },
      id_draft_berita: {
        type: Sequelize.STRING(10),
        allowNull: true,
        references: {
          model: 'DraftBeritas',
          key: 'id_draft_berita'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      catatan_revisi: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      tanggal_revisi: {
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
    await queryInterface.addIndex('RevisiDraftBeritas', ['id_draft_berita'], {
      name: 'idx_revisi_draft_beritas_draft'
    });
    await queryInterface.addIndex('RevisiDraftBeritas', ['tanggal_revisi'], {
      name: 'idx_revisi_draft_beritas_tanggal'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('RevisiDraftBeritas');
  }
};
