'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class JabatanPimpinan extends Model {
    static associate(models) {
      JabatanPimpinan.hasMany(models.PeriodeJabatan, {
        foreignKey: 'id_jabatan',
        as: 'periodeJabatans'
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