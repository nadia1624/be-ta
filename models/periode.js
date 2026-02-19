'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Periode extends Model {
    static associate(models) {
      Periode.hasMany(models.PeriodeJabatan, {
        foreignKey: 'id_periode',
        as: 'periodeJabatans'
      });
    }
  }

  Periode.init({
    id_periode: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true
    },
    nama_periode: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    tanggal_mulai: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    tanggal_selesai: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    keterangan: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status_periode: {
      type: DataTypes.ENUM('aktif', 'nonaktif'),
      defaultValue: 'aktif'
    }
  }, {
    sequelize,
    modelName: 'Periode',
    tableName: 'Periodes'
  });

  return Periode;
};