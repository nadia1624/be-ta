'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class NotificationSubscription extends Model {
    static associate(models) {
      NotificationSubscription.belongsTo(models.User, {
        foreignKey: 'id_user',
        as: 'user'
      });
    }
  }

  NotificationSubscription.init({
    id_subscription: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    id_user: {
      type: DataTypes.STRING(10),
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id_user'
      }
    },
    endpoint: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true
    },
    p256dh: {
      type: DataTypes.STRING,
      allowNull: false
    },
    auth: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'NotificationSubscription',
    tableName: 'NotificationSubscriptions'
  });

  return NotificationSubscription;
};
