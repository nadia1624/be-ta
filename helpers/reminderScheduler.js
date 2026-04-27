const cron = require('node-cron');
const { Op } = require('sequelize');
const moment = require('moment');
const { Agenda, AgendaPimpinan, PimpinanAjudan, User } = require('../models');
const { sendPushNotification } = require('./pushNotificationHelper');

const initReminders = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = moment().utcOffset(7);
      const today = now.format('YYYY-MM-DD');
      
      // Check for reminders 30 mins and 60 mins before
      const windows = [30, 60];

      for (const minutesBefore of windows) {
        const targetTime = moment().utcOffset(7).add(minutesBefore, 'minutes');
        const timeStr = targetTime.format('HH:mm:00');
        
        // Find agendas starting today at targetTime
        const upcomingAgendas = await Agenda.findAll({
          where: {
            tanggal_kegiatan: today,
            waktu_mulai: timeStr
          },
          include: [
            {
              model: AgendaPimpinan,
              as: 'agendaPimpinans',
              where: {
                status_kehadiran: 'hadir' // Only notify if pimpinan is attending
              }
            }
          ]
        });

        for (const agenda of upcomingAgendas) {
          for (const ap of agenda.agendaPimpinans) {
            // Find Ajudan for this Pimpinan
            const ajudans = await PimpinanAjudan.findAll({
              where: {
                id_jabatan_pimpinan: ap.id_jabatan,
                id_periode_pimpinan: ap.id_periode
              },
              include: [{ model: User, as: 'userAjudan' }]
            });

            for (const ajudan of ajudans) {
              if (ajudan.userAjudan) {
                await sendPushNotification(ajudan.id_user_ajudan, {
                  title: 'Pengingat Agenda',
                  body: `Agenda "${agenda.nama_kegiatan}" akan dimulai dalam ${minutesBefore} menit di ${agenda.lokasi_kegiatan}.`,
                  data: {
                    url: `/agenda/${agenda.id_agenda}`,
                    type: 'reminder'
                  }
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in reminder cron job:', error);
    }
  });

  console.log('Reminder scheduler initialized');
};

module.exports = {
  initReminders
};
