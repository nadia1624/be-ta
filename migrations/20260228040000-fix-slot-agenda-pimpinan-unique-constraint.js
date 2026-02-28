'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop the overly restrictive unique constraint that only covers
    // (id_agenda, id_jabatan_diusulkan, id_periode_diusulkan).
    // This causes duplicate key errors when a single agenda spans multiple time slots,
    // since each slot creates a separate row with the same diusulkan combination.
    await queryInterface.removeConstraint('SlotAgendaPimpinans', 'uq_slot_agenda_diusulkan');

    // Add a correct unique constraint that includes tanggal and id_slot_waktu,
    // so each (agenda + slot_waktu + tanggal + diusulkan) combination is unique.
    await queryInterface.addConstraint('SlotAgendaPimpinans', {
      fields: ['id_agenda', 'tanggal', 'id_slot_waktu', 'id_jabatan_diusulkan', 'id_periode_diusulkan'],
      type: 'unique',
      name: 'uq_slot_agenda_diusulkan_v2'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('SlotAgendaPimpinans', 'uq_slot_agenda_diusulkan_v2');

    await queryInterface.addConstraint('SlotAgendaPimpinans', {
      fields: ['id_agenda', 'id_jabatan_diusulkan', 'id_periode_diusulkan'],
      type: 'unique',
      name: 'uq_slot_agenda_diusulkan'
    });
  }
};
