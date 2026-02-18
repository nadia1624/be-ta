'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PenugasanStaffs', {
      id_penugasan: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'Penugasans',
          key: 'id_penugasan'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_user_staff: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'Users',
          key: 'id_user'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status_pelaksanaan: {
        type: Sequelize.ENUM('belum', 'selesai'),
        defaultValue: 'belum'
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
    await queryInterface.addIndex('PenugasanStaffs', ['id_user_staff'], {
      name: 'idx_penugasan_staffs_staff'
    });
    await queryInterface.addIndex('PenugasanStaffs', ['status_pelaksanaan'], {
      name: 'idx_penugasan_staffs_status'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PenugasanStaffs');
  }
};
