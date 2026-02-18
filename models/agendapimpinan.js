'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AgendaPimpinan extends Model {
    static associate(models) {
      AgendaPimpinan.belongsTo(models.Agenda, {
        foreignKey: 'id_agenda',
        as: 'agenda'
      });
      AgendaPimpinan.belongsTo(models.PeriodePimpinan, {
        foreignKey: 'id_pimpinan',
        targetKey: 'id_pimpinan',
        as: 'periodePimpinan'
      });
    }
  }

  AgendaPimpinan.init({
    id_agenda: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'Agenda',
        key: 'id_agenda'
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
    status_kehadiran: {
      type: DataTypes.ENUM('hadir', 'tidak_hadir', 'diwakilkan')
    },
    nama_perwakilan: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    keterangan: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    surat_disposisi: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'AgendaPimpinan',
    tableName: 'AgendaPimpinans'
  });

  return AgendaPimpinan;
};