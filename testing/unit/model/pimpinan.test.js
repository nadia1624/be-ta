const { Model, DataTypes } = require('sequelize');
const PimpinanModel = require('../../../models/pimpinan');

describe('Pimpinan Model', () => {
  let Pimpinan;
  const sequelize = {}; 

  test('should initialize with correct attributes', () => {
    const { Model, DataTypes } = require('sequelize');
    const PimpinanModel = require('../../../models/pimpinan');
    
    Pimpinan = PimpinanModel(sequelize, DataTypes);
    
    expect(Model.init).toHaveBeenCalledWith(
      expect.objectContaining({
        id_pimpinan: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        }),
        nama_pimpinan: expect.objectContaining({ 
          allowNull: false 
        }),
        is_calendar_synced: expect.objectContaining({ 
          defaultValue: false 
        })
      }),
      expect.objectContaining({
        modelName: 'Pimpinan',
        tableName: 'Pimpinans'
      })
    );
  });

  test('should define correct associations', () => {
    const { Model } = require('sequelize');
    const models = {
      PeriodeJabatan: { name: 'PeriodeJabatan' }
    };

    Pimpinan.associate(models);

    expect(Model.hasMany).toHaveBeenCalledWith(models.PeriodeJabatan, expect.objectContaining({ as: 'periodeJabatans' }));
  });
});
