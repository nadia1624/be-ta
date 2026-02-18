'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SlotAgendaStaff extends Model {
    static associate(models) {
      SlotAgendaStaff.belongsTo(models.SlotAgendaPimpinan, {
        foreignKey: 'tanggal',
        targetKey: 'tanggal',
        as: 'slotAgendaPimpinan'
      });
      SlotAgendaStaff.belongsTo(models.SlotAgendaPimpinan, {
        foreignKey: 'id_slot_waktu',
        targetKey: 'id_slot_waktu',
        as: 'slotAgendaPimpinan'
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
      primaryKey: true,
      references: {
        model: 'SlotAgendaPimpinans',
        key: 'tanggal'
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
    id_slot_waktu: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'SlotAgendaPimpinans',
        key: 'id_slot_waktu'
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
      defaultValue: 'hadir'
    }
  }, {
    sequelize,
    modelName: 'SlotAgendaStaff',
    tableName: 'SlotAgendaStaffs'
  });

  return SlotAgendaStaff;
};