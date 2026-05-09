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
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('initReminders should schedule a cron job', () => {
    initReminders();
    expect(cron.schedule).toHaveBeenCalledWith('* * * * *', expect.any(Function));
  });

  test('cron job should find upcoming agendas and send notifications', async () => {
    // Setup moment mock
    const mockNow = {
      format: jest.fn().mockReturnValue('2023-10-10'),
      add: jest.fn().mockReturnThis(),
      utcOffset: jest.fn().mockReturnThis()
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

  test('cron job should not send notification if userAjudan is missing', async () => {
    const mockNow = { 
      format: jest.fn().mockReturnValue('2023-10-10'), 
      add: jest.fn().mockReturnThis(),
      utcOffset: jest.fn().mockReturnThis()
    };
    moment.mockReturnValue(mockNow);
    initReminders();
    const cronJobAction = cron.schedule.mock.calls[0][1];

    Agenda.findAll.mockResolvedValue([{ 
      agendaPimpinans: [{ id_jabatan: 'J1', id_periode: 'P1' }] 
    }]);
    PimpinanAjudan.findAll.mockResolvedValue([{ id_user_ajudan: 'U1', userAjudan: null }]);

    await cronJobAction();

    expect(sendPushNotification).not.toHaveBeenCalled();
  });

  test('cron job should handle database errors (catch block)', async () => {
    const mockNow = { 
      format: jest.fn().mockReturnValue('2023-10-10'), 
      add: jest.fn().mockReturnThis(),
      utcOffset: jest.fn().mockReturnThis()
    };
    moment.mockReturnValue(mockNow);
    initReminders();
    const cronJobAction = cron.schedule.mock.calls[0][1];

    const error = new Error('DB Fail');
    Agenda.findAll.mockRejectedValue(error);

    await cronJobAction();

    expect(consoleSpy).toHaveBeenCalledWith('Error in reminder cron job:', error);
  });

  test('cron job should do nothing if no upcoming agendas found', async () => {
    const mockNow = { 
      format: jest.fn().mockReturnValue('2023-10-10'), 
      add: jest.fn().mockReturnThis(),
      utcOffset: jest.fn().mockReturnThis()
    };
    moment.mockReturnValue(mockNow);
    initReminders();
    const cronJobAction = cron.schedule.mock.calls[0][1];

    Agenda.findAll.mockResolvedValue([]);

    await cronJobAction();

    expect(PimpinanAjudan.findAll).not.toHaveBeenCalled();
    expect(sendPushNotification).not.toHaveBeenCalled();
  });
});
