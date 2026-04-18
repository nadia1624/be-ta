const { Model, DataTypes } = require('sequelize');
const NotificationSubscriptionModel = require('../../../models/notificationsubscription');

describe('NotificationSubscription Model', () => {
  let NotificationSubscription;
  const sequelize = {}; 

  test('should initialize with correct attributes', () => {
    const { Model, DataTypes } = require('sequelize');
    const NotificationSubscriptionModel = require('../../../models/notificationsubscription');
    
    NotificationSubscription = NotificationSubscriptionModel(sequelize, DataTypes);
    
    expect(Model.init).toHaveBeenCalledWith(
      expect.objectContaining({
        id_user: expect.objectContaining({ allowNull: false }),
        endpoint: expect.objectContaining({ allowNull: false }),
        p256dh: expect.objectContaining({ allowNull: false }),
        auth: expect.objectContaining({ allowNull: false })
      }),
      expect.objectContaining({
        modelName: 'NotificationSubscription',
        tableName: 'NotificationSubscriptions'
      })
    );
  });

  test('should define correct associations', () => {
    const { Model } = require('sequelize');
    const models = {
      User: { name: 'User' }
    };

    NotificationSubscription.associate(models);

    expect(Model.belongsTo).toHaveBeenCalledWith(models.User, expect.objectContaining({ as: 'user' }));
  });
});
