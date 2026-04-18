const { Model, DataTypes } = require('sequelize');
const KASKPDPendampingModel = require('../../../models/kaskpdpendamping');

describe('KASKPDPendamping Model', () => {
  let KASKPDPendamping;
  const sequelize = {}; 

  test('should initialize with correct attributes', () => {
    const { Model, DataTypes } = require('sequelize');
    const KASKPDPendampingModel = require('../../../models/kaskpdpendamping');
    
    KASKPDPendamping = KASKPDPendampingModel(sequelize, DataTypes);
    
    expect(Model.init).toHaveBeenCalledWith(
      expect.objectContaining({
        id_agenda: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        }),
        id_ka_skpd: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        })
      }),
      expect.objectContaining({
        modelName: 'KASKPDPendamping',
        tableName: 'KASKPDPendampings'
      })
    );
  });

  test('should define correct associations', () => {
    const { Model } = require('sequelize');
    const models = {
      Agenda: { name: 'Agenda' },
      KASKPD: { name: 'KASKPD' }
    };

    KASKPDPendamping.associate(models);

    expect(Model.belongsTo).toHaveBeenCalledWith(models.Agenda, expect.objectContaining({ as: 'agenda' }));
    expect(Model.belongsTo).toHaveBeenCalledWith(models.KASKPD, expect.objectContaining({ as: 'kaskpd' }));
  });
});
