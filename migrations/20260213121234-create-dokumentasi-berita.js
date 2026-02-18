'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DokumentasiBeritas', {
      id_dokumentasi: {
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
      file_path: {
        type: Sequelize.STRING,
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

    // Add indexes
    await queryInterface.addIndex('DokumentasiBeritas', ['id_draft_berita'], {
      name: 'idx_dokumentasi_beritas_draft'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('DokumentasiBeritas');
  }
};
