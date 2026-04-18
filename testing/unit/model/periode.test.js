const { Model, DataTypes } = require('sequelize');
const PeriodeModel = require('../../../models/periode');

describe('Periode Model', () => {
  let Periode;
  const sequelize = {}; 

  test('should initialize with correct attributes', () => {
    const { Model, DataTypes } = require('sequelize');
    const PeriodeModel = require('../../../models/periode');
    
    Periode = PeriodeModel(sequelize, DataTypes);
    
    expect(Model.init).toHaveBeenCalledWith(
      expect.objectContaining({
        id_periode: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        }),
        nama_periode: expect.objectContaining({ 
          allowNull: false 
        }),
        status_periode: expect.objectContaining({
          type: expect.objectContaining({ values: ['aktif', 'nonaktif'] }),
          defaultValue: 'aktif'
        })
      }),
      expect.objectContaining({
        modelName: 'Periode',
        tableName: 'Periodes'
      })
    );
  });

  test('should define correct associations', () => {
    const { Model } = require('sequelize');
    const models = {
      PeriodeJabatan: { name: 'PeriodeJabatan' }
    };

    Periode.associate(models);

    expect(Model.hasMany).toHaveBeenCalledWith(models.PeriodeJabatan, expect.objectContaining({ as: 'periodeJabatans' }));
  });
});
