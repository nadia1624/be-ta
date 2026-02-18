'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class KASKPD extends Model {
    static associate(models) {
      KASKPD.hasMany(models.KASKPDPendamping, {
        foreignKey: 'id_ka_skpd',
        sourceKey: 'id_ka_skpd',
        as: 'pendampings'
      });
    }
  }

  KASKPD.init({
    id_ka_skpd: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true
    },
    nama_instansi: {
      type: DataTypes.STRING(50),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'KASKPD',
    tableName: 'KASKPDs'
  });

  return KASKPD;
};