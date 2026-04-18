const { Model, DataTypes } = require('sequelize');
const DraftBeritaModel = require('../../../models/draftberita');

describe('DraftBerita Model', () => {
  let DraftBerita;
  const sequelize = {}; 

  test('should initialize with correct attributes', () => {
    const { Model, DataTypes } = require('sequelize');
    const DraftBeritaModel = require('../../../models/draftberita');
    
    DraftBerita = DraftBeritaModel(sequelize, DataTypes);
    
    expect(Model.init).toHaveBeenCalledWith(
      expect.objectContaining({
        id_draft_berita: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        }),
        judul_berita: expect.objectContaining({ 
          allowNull: false 
        }),
        status_draft: expect.objectContaining({
          type: expect.objectContaining({ values: ['draft', 'review', 'approved'] }),
          defaultValue: 'draft'
        })
      }),
      expect.objectContaining({
        modelName: 'DraftBerita',
        tableName: 'DraftBeritas'
      })
    );
  });

  test('should define correct associations', () => {
    const { Model } = require('sequelize');
    const models = {
      Penugasan: { name: 'Penugasan' },
      User: { name: 'User' },
      RevisiDraftBerita: { name: 'RevisiDraftBerita' },
      DokumentasiBerita: { name: 'DokumentasiBerita' }
    };

    DraftBerita.associate(models);

    expect(Model.belongsTo).toHaveBeenCalledWith(models.Penugasan, expect.objectContaining({ as: 'penugasan' }));
    expect(Model.belongsTo).toHaveBeenCalledWith(models.User, expect.objectContaining({ as: 'staff' }));
    expect(Model.hasMany).toHaveBeenCalledWith(models.RevisiDraftBerita, expect.objectContaining({ as: 'revisies' }));
  });
});
