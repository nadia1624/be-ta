'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SlotWaktus', {
      id_slot_waktu: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true
      },
      slot_waktu_mulai: {
        type: Sequelize.TIME,
        allowNull: false
      },
      slot_waktu_selesai: {
        type: Sequelize.TIME,
        allowNull: false
      },
      nomor_urut: {
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
    await queryInterface.addIndex('SlotWaktus', ['slot_waktu_mulai', 'slot_waktu_selesai'], {
      name: 'idx_slot_waktus_waktu'
    });
    await queryInterface.addIndex('SlotWaktus', ['nomor_urut'], {
      name: 'idx_slot_waktus_urut'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('SlotWaktus');
  }
};
