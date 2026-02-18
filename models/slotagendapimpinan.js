'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SlotAgendaPimpinan extends Model {
    static associate(models) {
      SlotAgendaPimpinan.belongsTo(models.SlotWaktu, {
        foreignKey: 'id_slot_waktu',
        as: 'slotWaktu'
      });
      SlotAgendaPimpinan.belongsTo(models.Agenda, {
        foreignKey: 'id_agenda',
        as: 'agenda'
      });
      SlotAgendaPimpinan.hasMany(models.KehadiranPimpinan, {
        foreignKey: 'tanggal',
        sourceKey: 'tanggal',
        as: 'kehadiranPimpinans'
      });
      SlotAgendaPimpinan.hasMany(models.KehadiranPimpinan, {
        foreignKey: 'id_slot_waktu',
        sourceKey: 'id_slot_waktu',
        as: 'kehadiranPimpinans'
      });
      SlotAgendaPimpinan.hasMany(models.SlotAgendaStaff, {
        foreignKey: 'tanggal',
        sourceKey: 'tanggal',
        as: 'slotAgendaStaffs'
      });
      SlotAgendaPimpinan.hasMany(models.SlotAgendaStaff, {
        foreignKey: 'id_slot_waktu',
        sourceKey: 'id_slot_waktu',
        as: 'slotAgendaStaffs'
      });
    }
  }

  SlotAgendaPimpinan.init({
    tanggal: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      primaryKey: true
    },
    id_slot_waktu: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'SlotWaktus',
        key: 'id_slot_waktu'
      }
    },
    id_agenda: {
      type: DataTypes.STRING(10),
      allowNull: true,
      references: {
        model: 'Agenda',
        key: 'id_agenda'
      }
    }
  }, {
    sequelize,
    modelName: 'SlotAgendaPimpinan',
    tableName: 'SlotAgendaPimpinans'
  });

  return SlotAgendaPimpinan;
};