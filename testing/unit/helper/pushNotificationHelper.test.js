const webpush = require('web-push');
const { NotificationSubscription } = require('../../../models');
const { sendPushNotification } = require('../../../helpers/pushNotificationHelper');

// Mock web-push
jest.mock('web-push');

// Mock models
jest.mock('../../../models', () => ({
  NotificationSubscription: {
    findAll: jest.fn(),
    destroy: jest.fn()
  }
}));

describe('Push Notification Helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should send notifications to all subscriptions', async () => {
    const id_user = 'U001';
    const payload = { title: 'Test' };
    const mockSubscriptions = [
      { endpoint: 'ep1', p256dh: 'd1', auth: 'a1', destroy: jest.fn() },
      { endpoint: 'ep2', p256dh: 'd2', auth: 'a2', destroy: jest.fn() }
    ];

    NotificationSubscription.findAll.mockResolvedValue(mockSubscriptions);
    webpush.sendNotification.mockResolvedValue({});

    await sendPushNotification(id_user, payload);

    expect(NotificationSubscription.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { id_user }
    }));
    expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
  });

  test('should return early if no subscriptions found', async () => {
    NotificationSubscription.findAll.mockResolvedValue([]);
    
    await sendPushNotification('U001', {});

    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  test('should destroy subscription if it has expired (410)', async () => {
    const sub = { endpoint: 'ep1', destroy: jest.fn() };
    NotificationSubscription.findAll.mockResolvedValue([sub]);
    webpush.sendNotification.mockRejectedValue({ statusCode: 410 });

    await sendPushNotification('U001', {});

    expect(sub.destroy).toHaveBeenCalled();
  });

  test('should log error but not destroy if error is not 410/404', async () => {
    const sub = { endpoint: 'ep1', destroy: jest.fn() };
    NotificationSubscription.findAll.mockResolvedValue([sub]);
    webpush.sendNotification.mockRejectedValue({ statusCode: 500 });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await sendPushNotification('U001', {});

    expect(sub.destroy).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
