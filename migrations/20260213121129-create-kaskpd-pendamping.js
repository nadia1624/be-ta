'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('KASKPDPendampings', {
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
      id_ka_skpd: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'KASKPDs',
          key: 'id_ka_skpd'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      nama_pendamping: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      jabatan: {
        type: Sequelize.STRING(50),
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
    await queryInterface.addIndex('KASKPDPendampings', ['id_ka_skpd'], {
      name: 'idx_kaskpd_skpd'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('KASKPDPendampings');
  }
};
