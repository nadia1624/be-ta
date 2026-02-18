'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Pimpinan extends Model {
    static associate(models) {
      Pimpinan.hasMany(models.PeriodePimpinan, {
        foreignKey: 'id_pimpinan',
        as: 'periodePimpinans'
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
    }
  }, {
    sequelize,
    modelName: 'Pimpinan',
    tableName: 'Pimpinans'
  });

  return Pimpinan;
};