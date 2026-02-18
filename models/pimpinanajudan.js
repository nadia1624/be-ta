'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PimpinanAjudan extends Model {
    static associate(models) {
      PimpinanAjudan.belongsTo(models.PeriodePimpinan, {
        foreignKey: 'id_pimpinan',
        targetKey: 'id_pimpinan',
        as: 'periodePimpinan'
      });
      PimpinanAjudan.belongsTo(models.User, {
        foreignKey: 'id_user_ajudan',
        as: 'ajudan'
      });
    }
  }

  PimpinanAjudan.init({
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