const { Model, DataTypes } = require('sequelize');
const PeriodeJabatanModel = require('../../../models/periodejabatan');

describe('PeriodeJabatan Model', () => {
  let PeriodeJabatan;
  const sequelize = {}; 

  test('should initialize with correct attributes', () => {
    const { Model, DataTypes } = require('sequelize');
    const PeriodeJabatanModel = require('../../../models/periodejabatan');
    
    PeriodeJabatan = PeriodeJabatanModel(sequelize, DataTypes);
    
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
        status_aktif: expect.objectContaining({
          type: expect.objectContaining({ values: ['aktif', 'nonaktif'] }),
          defaultValue: 'aktif'
        })
      }),
      expect.objectContaining({
        modelName: 'PeriodeJabatan',
        tableName: 'PeriodeJabatans'
      })
    );
  });

  test('should define correct associations', () => {
    const { Model } = require('sequelize');
    const models = {
      Pimpinan: { name: 'Pimpinan' },
      Periode: { name: 'Periode' },
      JabatanPimpinan: { name: 'JabatanPimpinan' },
      SlotAgendaPimpinan: { name: 'SlotAgendaPimpinan' },
      AgendaPimpinan: { name: 'AgendaPimpinan' },
      PimpinanAjudan: { name: 'PimpinanAjudan' }
    };

    PeriodeJabatan.associate(models);

    expect(Model.belongsTo).toHaveBeenCalledWith(models.Pimpinan, expect.objectContaining({ as: 'pimpinan' }));
    expect(Model.belongsTo).toHaveBeenCalledWith(models.Periode, expect.objectContaining({ as: 'periode' }));
    expect(Model.belongsTo).toHaveBeenCalledWith(models.JabatanPimpinan, expect.objectContaining({ as: 'jabatan' }));
  });
});
