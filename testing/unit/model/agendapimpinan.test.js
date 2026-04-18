const { Model, DataTypes } = require('sequelize');
const AgendaPimpinanModel = require('../../../models/agendapimpinan');

describe('AgendaPimpinan Model', () => {
  let AgendaPimpinan;
  const sequelize = {}; 

  test('should initialize with correct attributes', () => {
    const { Model, DataTypes } = require('sequelize');
    const AgendaPimpinanModel = require('../../../models/agendapimpinan');
    
    AgendaPimpinan = AgendaPimpinanModel(sequelize, DataTypes);
    
    expect(Model.init).toHaveBeenCalledWith(
      expect.objectContaining({
        id_agenda: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        }),
        id_jabatan: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        }),
        status_kehadiran: expect.objectContaining({
          type: expect.objectContaining({ values: ['hadir', 'tidak_hadir', 'diwakilkan'] })
        })
      }),
      expect.objectContaining({
        modelName: 'AgendaPimpinan',
        tableName: 'AgendaPimpinans'
      })
    );
  });

  test('should define correct associations', () => {
    const { Model } = require('sequelize');
    const models = {
      Agenda: { name: 'Agenda' },
      PeriodeJabatan: { name: 'PeriodeJabatan' }
    };

    AgendaPimpinan.associate(models);

    expect(Model.belongsTo).toHaveBeenCalledWith(models.Agenda, expect.objectContaining({ as: 'agenda' }));
    expect(Model.belongsTo).toHaveBeenCalledWith(models.PeriodeJabatan, expect.objectContaining({ as: 'periodeJabatan' }));
  });
});
