const { Model, DataTypes } = require('sequelize');
const LaporanKegiatanModel = require('../../../models/laporankegiatan');

describe('LaporanKegiatan Model', () => {
  let LaporanKegiatan;
  const sequelize = {}; 

  test('should initialize with correct attributes', () => {
    const { Model, DataTypes } = require('sequelize');
    const LaporanKegiatanModel = require('../../../models/laporankegiatan');
    
    LaporanKegiatan = LaporanKegiatanModel(sequelize, DataTypes);
    
    expect(Model.init).toHaveBeenCalledWith(
      expect.objectContaining({
        id_laporan: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        })
      }),
      expect.objectContaining({
        modelName: 'LaporanKegiatan',
        tableName: 'LaporanKegiatans'
      })
    );
  });

  test('should define correct associations', () => {
    const { Model } = require('sequelize');
    const models = {
      Penugasan: { name: 'Penugasan' },
      User: { name: 'User' }
    };

    LaporanKegiatan.associate(models);

    expect(Model.belongsTo).toHaveBeenCalledWith(models.Penugasan, expect.objectContaining({ as: 'penugasan' }));
    expect(Model.belongsTo).toHaveBeenCalledWith(models.User, expect.objectContaining({ as: 'staff' }));
  });
});
