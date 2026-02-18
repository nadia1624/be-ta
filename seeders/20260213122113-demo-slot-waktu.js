'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const slots = [];
    let counter = 1;

    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const startHour = String(hour).padStart(2, '0');
        const startMinute = String(minute).padStart(2, '0');

        // Calculate end time
        let endMinute = minute + 15;
        let endHour = hour;
        if (endMinute >= 60) {
          endMinute = 0;
          endHour = hour + 1;
          if (endHour >= 24) {
            endHour = 0;
          }
        }
        const endHourStr = String(endHour).padStart(2, '0');
        const endMinuteStr = String(endMinute).padStart(2, '0');

        const idStr = String(counter).padStart(3, '0');

        slots.push({
          id_slot_waktu: `SW${idStr}`,
          slot_waktu_mulai: `${startHour}:${startMinute}:00`,
          slot_waktu_selesai: `${endHourStr}:${endMinuteStr}:00`,
          nomor_urut: String(counter),
          createdAt: new Date(),
          updatedAt: new Date()
        });

        counter++;
      }
    }

    await queryInterface.bulkInsert('SlotWaktus', slots, {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('SlotWaktus', null, {});
  }
};
