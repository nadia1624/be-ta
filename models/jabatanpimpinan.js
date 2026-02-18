'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class JabatanPimpinan extends Model {
    static associate(models) {
      JabatanPimpinan.hasMany(models.PeriodePimpinan, {
        foreignKey: 'id_jabatan',
        as: 'periodePimpinans'
      });
    }
  }

  JabatanPimpinan.init({
    id_jabatan: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true
    },
    nama_jabatan: {
      type: DataTypes.STRING(100),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'JabatanPimpinan',
    tableName: 'JabatanPimpinans'
  });

  return JabatanPimpinan;
};