'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class KehadiranPimpinan extends Model {
    static associate(models) {
      KehadiranPimpinan.belongsTo(models.SlotAgendaPimpinan, {
        foreignKey: 'tanggal',
        targetKey: 'tanggal',
        as: 'slotAgendaPimpinan'
      });
      KehadiranPimpinan.belongsTo(models.PeriodeJabatan, {
        foreignKey: 'id_jabatan',
        targetKey: 'id_jabatan',
        as: 'periodeJabatan'
      });
    }
  }

  KehadiranPimpinan.init({
    tanggal: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'SlotAgendaPimpinans',
        key: 'tanggal'
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
    kehadiran: {
      type: DataTypes.ENUM('hadir', 'tidak_hadir'),
      defaultValue: 'hadir'
    }
  }, {
    sequelize,
    modelName: 'KehadiranPimpinan',
    tableName: 'KehadiranPimpinans'
  });

  return KehadiranPimpinan;
};