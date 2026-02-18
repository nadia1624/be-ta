'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RevisiDraftBerita extends Model {
    static associate(models) {
      RevisiDraftBerita.belongsTo(models.DraftBerita, {
        foreignKey: 'id_draft_berita',
        as: 'draftBerita'
      });
    }
  }

  RevisiDraftBerita.init({
    id_revisi: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true
    },
    id_draft_berita: {
      type: DataTypes.STRING(10),
      allowNull: true,
      references: {
        model: 'DraftBeritas',
        key: 'id_draft_berita'
      }
    },
    catatan_revisi: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tanggal_revisi: {
      type: DataTypes.DATEONLY,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'RevisiDraftBerita',
    tableName: 'RevisiDraftBeritas'
  });

  return RevisiDraftBerita;
};