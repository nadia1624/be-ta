'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Penugasan extends Model {
    static associate(models) {
      Penugasan.belongsTo(models.User, {
        foreignKey: 'id_user_kasubag',
        as: 'kasubag'
      });
      Penugasan.hasMany(models.SlotAgendaStaff, {
        foreignKey: 'id_penugasan',
        as: 'slotAgendaStaffs'
      });
      Penugasan.hasMany(models.DraftBerita, {
        foreignKey: 'id_penugasan',
        as: 'draftBeritas'
      });
      Penugasan.hasMany(models.LaporanKegiatan, {
        foreignKey: 'id_penugasan',
        as: 'laporanKegiatans'
      });
    }
  }

  Penugasan.init({
    id_penugasan: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true
    },
    id_user_kasubag: {
      type: DataTypes.STRING(10),
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id_user'
      }
    },
    jenis_penugasan: {
      type: DataTypes.ENUM('protokol', 'media'),
      allowNull: true
    },
    deskripsi_penugasan: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tanggal_penugasan: {
      type: DataTypes.DATEONLY,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Penugasan',
    tableName: 'Penugasans'
  });

  return Penugasan;
};