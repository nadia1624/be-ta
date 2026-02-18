'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DraftBerita extends Model {
    static associate(models) {
      DraftBerita.belongsTo(models.Penugasan, {
        foreignKey: 'id_penugasan',
        as: 'penugasan'
      });
      DraftBerita.belongsTo(models.User, {
        foreignKey: 'id_user_staff',
        as: 'staff'
      });
      DraftBerita.hasMany(models.RevisiDraftBerita, {
        foreignKey: 'id_draft_berita',
        as: 'revisies'
      });
      DraftBerita.hasMany(models.DokumentasiBerita, {
        foreignKey: 'id_draft_berita',
        as: 'dokumentasis'
      });
    }
  }

  DraftBerita.init({
    id_draft_berita: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true
    },
    id_penugasan: {
      type: DataTypes.STRING(10),
      allowNull: true,
      references: {
        model: 'Penugasans',
        key: 'id_penugasan'
      }
    },
    id_user_staff: {
      type: DataTypes.STRING(10),
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id_user'
      }
    },
    judul_berita: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    isi_draft: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status_draft: {
      type: DataTypes.ENUM('draft', 'review', 'approved'),
      defaultValue: 'draft'
    },
    catatan: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tanggal_kirim: {
      type: DataTypes.DATEONLY,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'DraftBerita',
    tableName: 'DraftBeritas'
  });

  return DraftBerita;
};