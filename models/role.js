'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Role extends Model {
    static associate(models) {
      Role.hasMany(models.User, {
        foreignKey: 'id_role',
        as: 'users'
      });
    }
  }

  Role.init({
    id_role: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true
    },
    nama_role: {
      type: DataTypes.STRING(50),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Role',
    tableName: 'Roles'
  });

  return Role;
};