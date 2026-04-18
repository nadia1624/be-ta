const { Model, DataTypes } = require('sequelize');
const RevisiDraftBeritaModel = require('../../../models/revisidraftberita');

describe('RevisiDraftBerita Model', () => {
  let RevisiDraftBerita;
  const sequelize = {}; 

  test('should initialize with correct attributes', () => {
    const { Model, DataTypes } = require('sequelize');
    const RevisiDraftBeritaModel = require('../../../models/revisidraftberita');
    
    RevisiDraftBerita = RevisiDraftBeritaModel(sequelize, DataTypes);
    
    expect(Model.init).toHaveBeenCalledWith(
      expect.objectContaining({
        id_revisi: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        })
      }),
      expect.objectContaining({
        modelName: 'RevisiDraftBerita',
        tableName: 'RevisiDraftBeritas'
      })
    );
  });

  test('should define correct associations', () => {
    const { Model } = require('sequelize');
    const models = {
      DraftBerita: { name: 'DraftBerita' }
    };

    RevisiDraftBerita.associate(models);

    expect(Model.belongsTo).toHaveBeenCalledWith(models.DraftBerita, expect.objectContaining({ as: 'draftBerita' }));
  });
});
