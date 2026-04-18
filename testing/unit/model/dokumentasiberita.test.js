const { Model, DataTypes } = require('sequelize');
const DokumentasiBeritaModel = require('../../../models/dokumentasiberita');

describe('DokumentasiBerita Model', () => {
  let DokumentasiBerita;
  const sequelize = {}; 

  test('should initialize with correct attributes', () => {
    const { Model, DataTypes } = require('sequelize');
    const DokumentasiBeritaModel = require('../../../models/dokumentasiberita');
    
    DokumentasiBerita = DokumentasiBeritaModel(sequelize, DataTypes);
    
    expect(Model.init).toHaveBeenCalledWith(
      expect.objectContaining({
        id_dokumentasi: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        })
      }),
      expect.objectContaining({
        modelName: 'DokumentasiBerita',
        tableName: 'DokumentasiBeritas'
      })
    );
  });

  test('should define correct associations', () => {
    const { Model } = require('sequelize');
    const models = {
      DraftBerita: { name: 'DraftBerita' }
    };

    DokumentasiBerita.associate(models);

    expect(Model.belongsTo).toHaveBeenCalledWith(models.DraftBerita, expect.objectContaining({ as: 'draftBerita' }));
  });
});
