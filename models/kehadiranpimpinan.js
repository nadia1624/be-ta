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
      KehadiranPimpinan.belongsTo(models.PeriodePimpinan, {
        foreignKey: 'id_pimpinan',
        targetKey: 'id_pimpinan',
        as: 'periodePimpinan'
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
    id_pimpinan: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'PeriodePimpinans',
        key: 'id_pimpinan'
      }
    },
    id_periode: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'PeriodePimpinans',
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