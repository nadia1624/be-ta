'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Penugasans', 'status', {
      type: Sequelize.ENUM('pending', 'progress', 'selesai'),
      allowNull: true,
      defaultValue: null
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Penugasans', 'status');
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS \"enum_Penugasans_status\";");
  }
};
