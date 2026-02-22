'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SlotAgendaPimpinan extends Model {
    static associate(models) {
      SlotAgendaPimpinan.belongsTo(models.Agenda, {
        foreignKey: 'id_agenda',
        as: 'agenda'
      });
      SlotAgendaPimpinan.belongsTo(models.SlotWaktu, {
        foreignKey: 'id_slot_waktu',
        as: 'slotWaktu'
      });
      SlotAgendaPimpinan.belongsTo(models.PeriodeJabatan, {
        foreignKey: 'id_jabatan_hadir',
        targetKey: 'id_jabatan',
        as: 'periodeJabatanHadir'
      });
      SlotAgendaPimpinan.belongsTo(models.PeriodeJabatan, {
        foreignKey: 'id_jabatan_diusulkan',
        targetKey: 'id_jabatan',
        as: 'periodeJabatanDiusulkan'
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
    id_jabatan_hadir: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'PeriodeJabatans',
        key: 'id_jabatan'
      }
    },
    id_periode_hadir: {
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
    id_jabatan_diusulkan: {
      type: DataTypes.STRING(10),
      allowNull: true,
      references: {
        model: 'PeriodeJabatans',
        key: 'id_jabatan'
      }
    },
    id_periode_diusulkan: {
      type: DataTypes.STRING(10),
      allowNull: true,
      references: {
        model: 'PeriodeJabatans',
        key: 'id_periode'
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