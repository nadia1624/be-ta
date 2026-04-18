const { Model, DataTypes } = require('sequelize');
const AgendaModel = require('../../../models/agenda');

describe('Agenda Model', () => {
  let Agenda;
  const sequelize = {}; 

  test('should initialize with correct attributes', () => {
    const { Model, DataTypes } = require('sequelize');
    const AgendaModel = require('../../../models/agenda');
    
    Agenda = AgendaModel(sequelize, DataTypes);
    
    expect(Model.init).toHaveBeenCalledWith(
      expect.objectContaining({
        id_agenda: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        }),
        nomor_surat: expect.objectContaining({ 
          allowNull: false 
        })
      }),
      expect.objectContaining({
        modelName: 'Agenda',
        tableName: 'Agenda'
      })
    );
  });

  test('should define correct associations', () => {
    const { Model } = require('sequelize');
    const models = {
      User: { name: 'User' },
      StatusAgenda: { name: 'StatusAgenda' },
      SlotAgendaPimpinan: { name: 'SlotAgendaPimpinan' },
      AgendaPimpinan: { name: 'AgendaPimpinan' },
      KASKPDPendamping: { name: 'KASKPDPendamping' },
      Penugasan: { name: 'Penugasan' }
    };

    Agenda.associate(models);

    expect(Model.belongsTo).toHaveBeenCalledWith(models.User, expect.objectContaining({ as: 'pemohon' }));
    expect(Model.hasMany).toHaveBeenCalledWith(models.StatusAgenda, expect.objectContaining({ as: 'statusAgendas' }));
  });
});
