const { Model, DataTypes } = require('sequelize');
const PimpinanAjudanModel = require('../../../models/pimpinanajudan');

describe('PimpinanAjudan Model', () => {
  let PimpinanAjudan;
  const sequelize = {}; 

  test('should initialize with correct attributes', () => {
    const { Model, DataTypes } = require('sequelize');
    const PimpinanAjudanModel = require('../../../models/pimpinanajudan');
    
    PimpinanAjudan = PimpinanAjudanModel(sequelize, DataTypes);
    
    expect(Model.init).toHaveBeenCalledWith(
      expect.objectContaining({
        id_jabatan: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        }),
        id_periode: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        }),
        id_user_ajudan: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        }),
        status_aktif: expect.objectContaining({
          type: expect.objectContaining({ values: ['aktif', 'nonaktif'] }),
          defaultValue: 'nonaktif'
        })
      }),
      expect.objectContaining({
        modelName: 'PimpinanAjudan',
        tableName: 'PimpinanAjudans'
      })
    );
  });

  test('should define correct associations', () => {
    const { Model } = require('sequelize');
    const models = {
      PeriodeJabatan: { name: 'PeriodeJabatan' },
      User: { name: 'User' }
    };

    PimpinanAjudan.associate(models);

    expect(Model.belongsTo).toHaveBeenCalledWith(models.PeriodeJabatan, expect.objectContaining({ as: 'periodeJabatan' }));
    expect(Model.belongsTo).toHaveBeenCalledWith(models.User, expect.objectContaining({ as: 'ajudan' }));
  });
});
