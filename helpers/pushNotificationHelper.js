const webpush = require('web-push');
const { NotificationSubscription } = require('../models');

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  'mailto:nadyadearihanifah@gmail.com', // Replace with your email or use a generic one
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Send push notification to a specific user on all their registered devices
 * @param {string} id_user - The recipient's user ID
 * @param {Object} payload - Notification data (title, body, icon, data, etc.)
 */
const sendPushNotification = async (id_user, payload) => {
  try {
    const subscriptions = await NotificationSubscription.findAll({
      where: { id_user }
    });

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No subscriptions found for user: ${id_user}`);
      return;
    }

    const payloadString = JSON.stringify(payload);

    const sendPromises = subscriptions.map(sub => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      const options = {
        TTL: 604800, // 7 days in seconds
        urgency: 'high'
      };

      return webpush.sendNotification(pushSubscription, payloadString, options)
        .catch(async (err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription has expired or is no longer valid
            await sub.destroy();
          } else {
            console.error('Error sending push notification:', err);
          }
        });
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error('Error in sendPushNotification helper:', error);
  }
};

module.exports = {
  sendPushNotification
};
