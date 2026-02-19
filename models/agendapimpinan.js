'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AgendaPimpinan extends Model {
    static associate(models) {
      AgendaPimpinan.belongsTo(models.Agenda, {
        foreignKey: 'id_agenda',
        as: 'agenda'
      });
      AgendaPimpinan.belongsTo(models.PeriodeJabatan, {
        foreignKey: 'id_jabatan',
        targetKey: 'id_jabatan',
        as: 'periodeJabatan'
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