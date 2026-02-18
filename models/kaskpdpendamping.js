'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class KASKPDPendamping extends Model {
    static associate(models) {
      KASKPDPendamping.belongsTo(models.Agenda, {
        foreignKey: 'id_agenda',
        as: 'agenda'
      });
      KASKPDPendamping.belongsTo(models.KASKPD, {
        foreignKey: 'id_ka_skpd',
        targetKey: 'id_ka_skpd',
        as: 'kaskpd'
      });
    }
  }

  KASKPDPendamping.init({
    id_agenda: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'Agenda',
        key: 'id_agenda'
      }
    },
    id_ka_skpd: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'KASKPDs',
        key: 'id_ka_skpd'
      }
    },
    nama_pendamping: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    jabatan: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'KASKPDPendamping',
    tableName: 'KASKPDPendampings'
  });

  return KASKPDPendamping;
};