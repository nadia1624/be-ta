const { Model, DataTypes } = require('sequelize');
const PenugasanModel = require('../../../models/penugasan');

describe('Penugasan Model', () => {
  let Penugasan;
  const sequelize = {}; 

  test('should initialize with correct attributes', () => {
    const { Model, DataTypes } = require('sequelize');
    const PenugasanModel = require('../../../models/penugasan');
    
    Penugasan = PenugasanModel(sequelize, DataTypes);
    
    expect(Model.init).toHaveBeenCalledWith(
      expect.objectContaining({
        id_penugasan: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        }),
        jenis_penugasan: expect.objectContaining({
          type: expect.objectContaining({ values: ['protokol', 'media'] })
        }),
        status: expect.objectContaining({
          type: expect.objectContaining({ values: ['pending', 'progress', 'selesai'] }),
          defaultValue: null
        })
      }),
      expect.objectContaining({
        modelName: 'Penugasan',
        tableName: 'Penugasans'
      })
    );
  });

  test('should define correct associations', () => {
    const { Model } = require('sequelize');
    const models = {
      Agenda: { name: 'Agenda' },
      User: { name: 'User' },
      SlotAgendaStaff: { name: 'SlotAgendaStaff' },
      DraftBerita: { name: 'DraftBerita' },
      LaporanKegiatan: { name: 'LaporanKegiatan' }
    };

    Penugasan.associate(models);

    expect(Model.belongsTo).toHaveBeenCalledWith(models.Agenda, expect.objectContaining({ as: 'agenda' }));
    expect(Model.belongsTo).toHaveBeenCalledWith(models.User, expect.objectContaining({ as: 'kasubag' }));
    expect(Model.hasMany).toHaveBeenCalledWith(models.SlotAgendaStaff, expect.objectContaining({ as: 'slotAgendaStaffs' }));
  });
});
