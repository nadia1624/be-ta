'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SlotWaktu extends Model {
    static associate(models) {
      SlotWaktu.hasMany(models.SlotAgendaPimpinan, {
        foreignKey: 'id_slot_waktu',
        as: 'slotAgendaPimpinans'
      });
    }
  }

  SlotWaktu.init({
    id_slot_waktu: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true
    },
    slot_waktu_mulai: {
      type: DataTypes.TIME,
      allowNull: false
    },
    slot_waktu_selesai: {
      type: DataTypes.TIME,
      allowNull: false
    },
    nomor_urut: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'SlotWaktu',
    tableName: 'SlotWaktus'
  });

  return SlotWaktu;
};