'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PeriodePimpinan extends Model {
    static associate(models) {
      PeriodePimpinan.belongsTo(models.Pimpinan, {
        foreignKey: 'id_pimpinan',
        as: 'pimpinan'
      });
      PeriodePimpinan.belongsTo(models.Periode, {
        foreignKey: 'id_periode',
        as: 'periode'
      });
      PeriodePimpinan.belongsTo(models.JabatanPimpinan, {
        foreignKey: 'id_jabatan',
        as: 'jabatan'
      });
      PeriodePimpinan.hasMany(models.KehadiranPimpinan, {
        foreignKey: 'id_pimpinan',
        as: 'kehadiranPimpinans'
      });
      PeriodePimpinan.hasMany(models.AgendaPimpinan, {
        foreignKey: 'id_pimpinan',
        as: 'agendaPimpinans'
      });
      PeriodePimpinan.hasMany(models.PimpinanAjudan, {
        foreignKey: 'id_pimpinan',
        as: 'pimpinanAjudans'
      });
    }
  }

  PeriodePimpinan.init({
    id_pimpinan: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'Pimpinans',
        key: 'id_pimpinan'
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
    id_jabatan: {
      type: DataTypes.STRING(10),
      allowNull: true,
      references: {
        model: 'JabatanPimpinans',
        key: 'id_jabatan'
      }
    },
    status_aktif: {
      type: DataTypes.ENUM('aktif', 'nonaktif'),
      defaultValue: 'aktif'
    }
  }, {
    sequelize,
    modelName: 'PeriodePimpinan',
    tableName: 'PeriodePimpinans'
  });

  return PeriodePimpinan;
};