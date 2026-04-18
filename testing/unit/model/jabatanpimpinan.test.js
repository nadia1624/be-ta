const { Model, DataTypes } = require('sequelize');
const JabatanPimpinanModel = require('../../../models/jabatanpimpinan');

describe('JabatanPimpinan Model', () => {
  let JabatanPimpinan;
  const sequelize = {}; 

  test('should initialize with correct attributes', () => {
    const { Model, DataTypes } = require('sequelize');
    const JabatanPimpinanModel = require('../../../models/jabatanpimpinan');
    
    JabatanPimpinan = JabatanPimpinanModel(sequelize, DataTypes);
    
    expect(Model.init).toHaveBeenCalledWith(
      expect.objectContaining({
        id_jabatan: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        }),
        nama_jabatan: expect.objectContaining({ 
          allowNull: false 
        })
      }),
      expect.objectContaining({
        modelName: 'JabatanPimpinan',
        tableName: 'JabatanPimpinans'
      })
    );
  });

  test('should define correct associations', () => {
    const { Model } = require('sequelize');
    const models = {
      PeriodeJabatan: { name: 'PeriodeJabatan' }
    };

    JabatanPimpinan.associate(models);

    expect(Model.hasMany).toHaveBeenCalledWith(models.PeriodeJabatan, expect.objectContaining({ as: 'periodeJabatans' }));
  });
});
