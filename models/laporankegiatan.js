'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LaporanKegiatan extends Model {
    static associate(models) {
      LaporanKegiatan.belongsTo(models.Penugasan, {
        foreignKey: 'id_penugasan',
        as: 'penugasan'
      });
      LaporanKegiatan.belongsTo(models.User, {
        foreignKey: 'id_user_staff',
        as: 'staff'
      });
    }
  }

  LaporanKegiatan.init({
    id_laporan: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true
    },
    id_penugasan: {
      type: DataTypes.STRING(10),
      allowNull: true,
      references: {
        model: 'Penugasans',
        key: 'id_penugasan'
      }
    },
    id_user_staff: {
      type: DataTypes.STRING(10),
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id_user'
      }
    },
    deskripsi_laporan: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    catatan_laporan: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    dokumentasi_laporan: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'LaporanKegiatan',
    tableName: 'LaporanKegiatans'
  });

  return LaporanKegiatan;
};