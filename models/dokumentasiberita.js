'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DokumentasiBerita extends Model {
    static associate(models) {
      DokumentasiBerita.belongsTo(models.DraftBerita, {
        foreignKey: 'id_draft_berita',
        as: 'draftBerita'
      });
    }
  }

  DokumentasiBerita.init({
    id_dokumentasi: {
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
    file_path: {
      type: DataTypes.STRING,
      allowNull: true
    },
    keterangan: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'DokumentasiBerita',
    tableName: 'DokumentasiBeritas'
  });

  return DokumentasiBerita;
};