const { Model, DataTypes } = require('sequelize');
const StatusAgendaModel = require('../../../models/statusagenda');

describe('StatusAgenda Model', () => {
  let StatusAgenda;
  const sequelize = {}; 

  test('should initialize with correct attributes', () => {
    const { Model, DataTypes } = require('sequelize');
    const StatusAgendaModel = require('../../../models/statusagenda');
    
    StatusAgenda = StatusAgendaModel(sequelize, DataTypes);
    
    expect(Model.init).toHaveBeenCalledWith(
      expect.objectContaining({
        id_status_agenda: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        }),
        id_user_sespri: expect.objectContaining({ 
          allowNull: true 
        }),
        status_agenda: expect.objectContaining({
          type: expect.objectContaining({ 
            values: [
              'pending', 'revision', 'rejected_sespri', 'approved_sespri', 
              'approved_ajudan', 'delegated', 'rejected_ajudan', 
              'canceled', 'completed'
            ] 
          }),
          defaultValue: 'pending'
        })
      }),
      expect.objectContaining({
        modelName: 'StatusAgenda',
        tableName: 'StatusAgenda'
      })
    );
  });

  test('should define correct associations', () => {
    const { Model } = require('sequelize');
    const models = {
      Agenda: { name: 'Agenda' },
      User: { name: 'User' }
    };

    StatusAgenda.associate(models);

    expect(Model.belongsTo).toHaveBeenCalledWith(models.Agenda, expect.objectContaining({ as: 'agenda' }));
    expect(Model.belongsTo).toHaveBeenCalledWith(models.User, expect.objectContaining({ as: 'sespri' }));
  });
});
