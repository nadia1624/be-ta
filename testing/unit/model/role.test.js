const { Model, DataTypes } = require('sequelize');
const RoleModel = require('../../../models/role');

describe('Role Model', () => {
  let Role;
  const sequelize = {}; 

  test('should initialize with correct attributes', () => {
    const { Model, DataTypes } = require('sequelize');
    const RoleModel = require('../../../models/role');
    
    Role = RoleModel(sequelize, DataTypes);
    
    expect(Model.init).toHaveBeenCalledWith(
      expect.objectContaining({
        id_role: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        }),
        nama_role: expect.objectContaining({ 
          allowNull: false 
        })
      }),
      expect.objectContaining({
        modelName: 'Role',
        tableName: 'Roles'
      })
    );
  });

  test('should define correct associations', () => {
    const { Model } = require('sequelize');
    const models = {
      User: { name: 'User' }
    };

    Role.associate(models);

    expect(Model.hasMany).toHaveBeenCalledWith(models.User, expect.objectContaining({ foreignKey: 'id_role' }));
  });
});
