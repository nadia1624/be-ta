// Mock library eksternal agar tidak menembak API pihak ketiga secara tidak sengaja selama pengujian database riil

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
  generateVAPIDKeys: jest.fn(() => ({ publicKey: 'pk', privateKey: 'sk' }))
}));

jest.mock('../helpers/googleCalendarHelper', () => ({
  syncEvent: jest.fn().mockResolvedValue(null),
  deleteEvent: jest.fn().mockResolvedValue(null)
}));

jest.mock('../helpers/emailHelper', () => ({
  sendSyncInvitation: jest.fn().mockResolvedValue(true)
}));

jest.mock('../helpers/reminderScheduler', () => ({
  initReminders: jest.fn()
}));
