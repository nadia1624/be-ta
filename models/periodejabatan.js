'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PeriodeJabatan extends Model {
    static associate(models) {
      PeriodeJabatan.belongsTo(models.Pimpinan, {
        foreignKey: 'id_pimpinan',
        as: 'pimpinan'
      });
      PeriodeJabatan.belongsTo(models.Periode, {
        foreignKey: 'id_periode',
        as: 'periode'
      });
      PeriodeJabatan.belongsTo(models.JabatanPimpinan, {
        foreignKey: 'id_jabatan',
        as: 'jabatan'
      });
      PeriodeJabatan.hasMany(models.SlotAgendaPimpinan, {
        foreignKey: 'id_jabatan',
        as: 'slotAgendaPimpinans'
      });
      PeriodeJabatan.hasMany(models.AgendaPimpinan, {
        foreignKey: 'id_jabatan',
        as: 'agendaPimpinans'
      });
      PeriodeJabatan.hasMany(models.PimpinanAjudan, {
        foreignKey: 'id_jabatan',
        as: 'pimpinanAjudans'
      });
    }
  }

  PeriodeJabatan.init({
    id_jabatan: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'JabatanPimpinans',
        key: 'id_jabatan'
      }
    },
    id_periode: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'Periodes',
        key: 'id_periode'
      }
    },
    id_pimpinan: {
      type: DataTypes.STRING(10),
      allowNull: true,
      references: {
        model: 'Pimpinans',
        key: 'id_pimpinan'
      }
    },
    status_aktif: {
      type: DataTypes.ENUM('aktif', 'nonaktif'),
      defaultValue: 'aktif'
    }
  }, {
    sequelize,
    modelName: 'PeriodeJabatan',
    tableName: 'PeriodeJabatans'
  });

  return PeriodeJabatan;
};