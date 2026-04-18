const { Model, DataTypes } = require('sequelize');
const SlotAgendaPimpinanModel = require('../../../models/slotagendapimpinan');

describe('SlotAgendaPimpinan Model', () => {
  let SlotAgendaPimpinan;
  const sequelize = {}; 

  test('should initialize with correct attributes', () => {
    const { Model, DataTypes } = require('sequelize');
    const SlotAgendaPimpinanModel = require('../../../models/slotagendapimpinan');
    
    SlotAgendaPimpinan = SlotAgendaPimpinanModel(sequelize, DataTypes);
    
    expect(Model.init).toHaveBeenCalledWith(
      expect.objectContaining({
        tanggal: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        }),
        id_slot_waktu: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        }),
        id_jabatan_hadir: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        }),
        id_periode_hadir: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        }),
        kehadiran: expect.objectContaining({
          type: expect.objectContaining({ values: ['hadir', 'tidak_hadir'] }),
          defaultValue: 'hadir'
        })
      }),
      expect.objectContaining({
        modelName: 'SlotAgendaPimpinan',
        tableName: 'SlotAgendaPimpinans'
      })
    );
  });

  test('should define correct associations', () => {
    const { Model } = require('sequelize');
    const models = {
      Agenda: { name: 'Agenda' },
      SlotWaktu: { name: 'SlotWaktu' },
      PeriodeJabatan: { name: 'PeriodeJabatan' }
    };

    SlotAgendaPimpinan.associate(models);

    expect(Model.belongsTo).toHaveBeenCalledWith(models.Agenda, expect.objectContaining({ as: 'agenda' }));
    expect(Model.belongsTo).toHaveBeenCalledWith(models.SlotWaktu, expect.objectContaining({ as: 'slotWaktu' }));
    expect(Model.belongsTo).toHaveBeenCalledWith(models.PeriodeJabatan, expect.objectContaining({ as: 'periodeJabatanHadir' }));
    expect(Model.belongsTo).toHaveBeenCalledWith(models.PeriodeJabatan, expect.objectContaining({ as: 'periodeJabatanDiusulkan' }));
  });
});
