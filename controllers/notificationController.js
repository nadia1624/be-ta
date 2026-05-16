const BaseController = require('./BaseController');
const { NotificationSubscription } = require('../models');

class NotificationController extends BaseController {
  async subscribe(req, res) {
    try {
      const { endpoint, keys } = req.body;
      const id_user = req.user.id_user; 

      if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
        return this.sendResponse(res, 400, false, 'Invalid subscription object');
      }

      let subscription = await NotificationSubscription.findOne({
        where: { endpoint }
      });

      if (subscription) {
        subscription.id_user = id_user;
        subscription.p256dh = keys.p256dh;
        subscription.auth = keys.auth;
        await subscription.save();
      } else {
        subscription = await NotificationSubscription.create({
          id_user,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth
        });
      }

      return this.sendResponse(res, 201, true, 'Subscription saved successfully', subscription);
    } catch (error) {
      return this.sendError(res, error, 'Failed to save subscription');
    }
  }

  async unsubscribe(req, res) {
    try {
      const { endpoint } = req.body;
      const id_user = req.user.id_user;

      if (!endpoint) {
        return this.sendResponse(res, 400, false, 'Endpoint is required');
      }

      const deleted = await NotificationSubscription.destroy({
        where: { endpoint, id_user }
      });

      return this.sendResponse(res, 200, true, deleted ? 'Unsubscribed successfully' : 'Subscription not found');
    } catch (error) {
      return this.sendError(res, error, 'Failed to unsubscribe');
    }
  }
}

module.exports = new NotificationController();
