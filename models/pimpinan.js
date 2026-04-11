'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Pimpinan extends Model {
    static associate(models) {
      Pimpinan.hasMany(models.PeriodeJabatan, {
        foreignKey: 'id_pimpinan',
        as: 'periodeJabatans'
      });
    }
  }

  Pimpinan.init({
    id_pimpinan: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true
    },
    nama_pimpinan: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    nip: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    no_hp: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    google_access_token: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    google_refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    google_token_expiry: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    is_calendar_synced: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'Pimpinan',
    tableName: 'Pimpinans'
  });

  return Pimpinan;
};