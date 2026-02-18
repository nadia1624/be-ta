'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Pimpinans', {
      id_pimpinan: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true
      },
      nama_pimpinan: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      nip: {
        type: Sequelize.STRING(30),
        allowNull: true
      },
      email: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      no_hp: {
        type: Sequelize.STRING(20),
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
    await queryInterface.addIndex('Pimpinans', ['nama_pimpinan'], {
      name: 'idx_pimpinans_nama'
    });
    await queryInterface.addIndex('Pimpinans', ['nip'], {
      name: 'idx_pimpinans_nip'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Pimpinans');
  }
};
