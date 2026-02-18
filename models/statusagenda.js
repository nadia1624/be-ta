'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StatusAgenda extends Model {
    static associate(models) {
      StatusAgenda.belongsTo(models.Agenda, {
        foreignKey: 'id_agenda',
        as: 'agenda'
      });
      StatusAgenda.belongsTo(models.User, {
        foreignKey: 'id_user_sespri',
        as: 'sespri'
      });
    }
  }

  StatusAgenda.init({
    id_status_agenda: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true
    },
    id_agenda: {
      type: DataTypes.STRING(10),
      allowNull: true,
      references: {
        model: 'Agenda',
        key: 'id_agenda'
      }
    },
    id_user_sespri: {
      type: DataTypes.STRING(10),
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id_user'
      }
    },
    status_agenda: {
      type: DataTypes.ENUM('pending', 'disetujui', 'ditolak'),
      defaultValue: 'pending'
    },
    tanggal_status: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    catatan: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'StatusAgenda',
    tableName: 'StatusAgenda'
  });

  return StatusAgenda;
};