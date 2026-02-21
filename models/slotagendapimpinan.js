'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SlotAgendaPimpinan extends Model {
    static associate(models) {
      SlotAgendaPimpinan.belongsTo(models.Agenda, {
        foreignKey: 'id_agenda',
        as: 'agenda'
      });
      SlotAgendaPimpinan.belongsTo(models.PeriodeJabatan, {
        foreignKey: 'id_jabatan',
        targetKey: 'id_jabatan',
        as: 'periodeJabatan'
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
    id_jabatan: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'PeriodeJabatans',
        key: 'id_jabatan'
      }
    },
    id_periode: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'PeriodeJabatans',
        key: 'id_periode'
      }
    },
    id_agenda: {
      type: DataTypes.STRING(10),
      allowNull: false,
      references: {
        model: 'Agenda',
        key: 'id_agenda'
      }
    },
    kehadiran: {
      type: DataTypes.ENUM('hadir', 'tidak_hadir'),
      defaultValue: 'hadir'
    }
  }, {
    sequelize,
    modelName: 'SlotAgendaPimpinan',
    tableName: 'SlotAgendaPimpinans'
  });

  return SlotAgendaPimpinan;
};