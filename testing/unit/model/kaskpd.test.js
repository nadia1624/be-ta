const { Model, DataTypes } = require('sequelize');
const KASKPDModel = require('../../../models/kaskpd');

describe('KASKPD Model', () => {
  let KASKPD;
  const sequelize = {}; 

  test('should initialize with correct attributes', () => {
    const { Model, DataTypes } = require('sequelize');
    const KASKPDModel = require('../../../models/kaskpd');
    
    KASKPD = KASKPDModel(sequelize, DataTypes);
    
    expect(Model.init).toHaveBeenCalledWith(
      expect.objectContaining({
        id_ka_skpd: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        }),
        nama_instansi: expect.objectContaining({ 
          allowNull: false 
        })
      }),
      expect.objectContaining({
        modelName: 'KASKPD',
        tableName: 'KASKPDs'
      })
    );
  });

  test('should define correct associations', () => {
    const { Model } = require('sequelize');
    const models = {
      KASKPDPendamping: { name: 'KASKPDPendamping' }
    };

    KASKPD.associate(models);

    expect(Model.hasMany).toHaveBeenCalledWith(models.KASKPDPendamping, expect.objectContaining({ as: 'pendampings' }));
  });
});
