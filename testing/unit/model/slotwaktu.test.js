const { Model, DataTypes } = require('sequelize');
const SlotWaktuModel = require('../../../models/slotwaktu');

describe('SlotWaktu Model', () => {
  let SlotWaktu;
  const sequelize = {}; 

  test('should initialize with correct attributes', () => {
    const { Model, DataTypes } = require('sequelize');
    const SlotWaktuModel = require('../../../models/slotwaktu');
    
    SlotWaktu = SlotWaktuModel(sequelize, DataTypes);
    
    expect(Model.init).toHaveBeenCalledWith(
      expect.objectContaining({
        id_slot_waktu: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        }),
        slot_waktu_mulai: expect.objectContaining({ 
          allowNull: false 
        }),
        slot_waktu_selesai: expect.objectContaining({ 
          allowNull: false 
        })
      }),
      expect.objectContaining({
        modelName: 'SlotWaktu',
        tableName: 'SlotWaktus'
      })
    );
  });

  test('should define correct associations', () => {
    const { Model } = require('sequelize');
    const models = {
      SlotAgendaPimpinan: { name: 'SlotAgendaPimpinan' },
      SlotAgendaStaff: { name: 'SlotAgendaStaff' }
    };

    SlotWaktu.associate(models);

    expect(Model.hasMany).toHaveBeenCalledWith(models.SlotAgendaPimpinan, expect.objectContaining({ as: 'slotAgendaPimpinans' }));
    expect(Model.hasMany).toHaveBeenCalledWith(models.SlotAgendaStaff, expect.objectContaining({ as: 'slotAgendaStaffs' }));
  });
});
