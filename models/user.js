'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.Role, {
        foreignKey: 'id_role',
        as: 'role'
      });
      User.hasMany(models.Agenda, {
        foreignKey: 'id_user_pemohon',
        as: 'agendas'
      });
      User.hasMany(models.StatusAgenda, {
        foreignKey: 'id_user_sespri',
        as: 'statusAgendas'
      });
      User.hasMany(models.PimpinanAjudan, {
        foreignKey: 'id_user_ajudan',
        as: 'pimpinanAjudans'
      });
      User.hasMany(models.SlotAgendaStaff, {
        foreignKey: 'id_user_staff',
        as: 'slotAgendaStaffs'
      });
      User.hasMany(models.DraftBerita, {
        foreignKey: 'id_user_staff',
        as: 'draftBeritas'
      });
      User.hasMany(models.LaporanKegiatan, {
        foreignKey: 'id_user_staff',
        as: 'laporanKegiatans'
      });
      User.hasMany(models.Penugasan, {
        foreignKey: 'id_user_kasubag',
        as: 'penugasans'
      });
    }
  }

  User.init({
    id_user: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true
    },
    id_role: {
      type: DataTypes.STRING(10),
      allowNull: false,
      references: {
        model: 'Roles',
        key: 'id_role'
      }
    },
    nama: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    nip: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    instansi: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    alamat: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    no_hp: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    status_aktif: {
      type: DataTypes.ENUM('aktif', 'nonaktif'),
      defaultValue: 'aktif'
    },
    foto_profil: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    jabatan: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'Users'
  });

  return User;
};