'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SlotAgendaStaff extends Model {
    static associate(models) {
      SlotAgendaStaff.belongsTo(models.SlotWaktu, {
        foreignKey: 'id_slot_waktu',
        as: 'slotWaktu'
      });
      SlotAgendaStaff.belongsTo(models.User, {
        foreignKey: 'id_user_staff',
        as: 'staff'
      });
      SlotAgendaStaff.belongsTo(models.Penugasan, {
        foreignKey: 'id_penugasan',
        as: 'penugasan'
      });
    }
  }

  SlotAgendaStaff.init({
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
    id_user_staff: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'Users',
        key: 'id_user'
      }
    },
    id_penugasan: {
      type: DataTypes.STRING(10),
      allowNull: true,
      references: {
        model: 'Penugasans',
        key: 'id_penugasan'
      }
    },
    kehadiran: {
      type: DataTypes.ENUM('hadir', 'tidak_hadir', 'izin'),
      allowNull: true,
      defaultValue: null
    }
  }, {
    sequelize,
    modelName: 'SlotAgendaStaff',
    tableName: 'SlotAgendaStaffs'
  });

  return SlotAgendaStaff;
};