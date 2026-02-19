'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PimpinanAjudan extends Model {
    static associate(models) {
      PimpinanAjudan.belongsTo(models.PeriodeJabatan, {
        foreignKey: 'id_jabatan',
        targetKey: 'id_jabatan',
        as: 'periodeJabatan'
      });
      PimpinanAjudan.belongsTo(models.User, {
        foreignKey: 'id_user_ajudan',
        as: 'ajudan'
      });
    }
  }

  PimpinanAjudan.init({
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
    id_user_ajudan: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'Users',
        key: 'id_user'
      }
    },
    keterangan: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'PimpinanAjudan',
    tableName: 'PimpinanAjudans'
  });

  return PimpinanAjudan;
};