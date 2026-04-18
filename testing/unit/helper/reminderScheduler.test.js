const cron = require('node-cron');
const moment = require('moment');
const { initReminders } = require('../../../helpers/reminderScheduler');
const { Agenda, AgendaPimpinan, PimpinanAjudan, User } = require('../../../models');
const { sendPushNotification } = require('../../../helpers/pushNotificationHelper');

// Mock external dependencies
jest.mock('node-cron');
jest.mock('moment');
jest.mock('../../../helpers/pushNotificationHelper');

// Mock models
jest.mock('../../../models', () => ({
  Agenda: { findAll: jest.fn() },
  AgendaPimpinan: { },
  PimpinanAjudan: { findAll: jest.fn() },
  User: { }
}));

describe('Reminder Scheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initReminders should schedule a cron job', () => {
    initReminders();
    expect(cron.schedule).toHaveBeenCalledWith('* * * * *', expect.any(Function));
  });

  test('cron job should find upcoming agendas and send notifications', async () => {
    // Setup moment mock
    const mockNow = {
      format: jest.fn().mockReturnValue('2023-10-10'),
      add: jest.fn().mockReturnThis()
    };
    moment.mockReturnValue(mockNow);

    // Capture the cron job function
    initReminders();
    const cronJobAction = cron.schedule.mock.calls[0][1];

    // Mock data
    const mockAgenda = {
      id_agenda: 'A001',
      nama_kegiatan: 'Rapat',
      lokasi_kegiatan: 'Kantor',
      agendaPimpinans: [{ id_jabatan: 'J01', id_periode: 'P01' }]
    };
    Agenda.findAll.mockResolvedValue([mockAgenda]);

    const mockAjudan = {
      id_user_ajudan: 'U01',
      userAjudan: { nama: 'Ajudan 1' }
    };
    PimpinanAjudan.findAll.mockResolvedValue([mockAjudan]);

    // Execute cron job action
    await cronJobAction();

    expect(Agenda.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tanggal_kegiatan: '2023-10-10' })
    }));
    expect(PimpinanAjudan.findAll).toHaveBeenCalled();
    expect(sendPushNotification).toHaveBeenCalledWith('U01', expect.objectContaining({
      title: 'Pengingat Agenda'
    }));
  });
});
