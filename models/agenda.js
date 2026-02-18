'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Agenda extends Model {
    static associate(models) {
      Agenda.belongsTo(models.User, {
        foreignKey: 'id_user_pemohon',
        as: 'pemohon'
      });
      Agenda.hasMany(models.StatusAgenda, {
        foreignKey: 'id_agenda',
        as: 'statusAgendas'
      });
      Agenda.hasMany(models.SlotAgendaPimpinan, {
        foreignKey: 'id_agenda',
        as: 'slotAgendaPimpinans'
      });
      Agenda.hasMany(models.AgendaPimpinan, {
        foreignKey: 'id_agenda',
        as: 'agendaPimpinans'
      });
      Agenda.hasMany(models.KASKPDPendamping, {
        foreignKey: 'id_agenda',
        as: 'kaskpdPendampings'
      });
    }
  }

  Agenda.init({
    id_agenda: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true
    },
    id_user_pemohon: {
      type: DataTypes.STRING(10),
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id_user'
      }
    },
    nomor_surat: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    tanggal_surat: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    perihal: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    surat_permohonan: {
      type: DataTypes.STRING,
      allowNull: true
    },
    tanggal_pengajuan: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    nama_kegiatan: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    lokasi_kegiatan: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    contact_person: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    keterangan: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Agenda',
    tableName: 'Agenda'
  });

  return Agenda;
};