const { Model, DataTypes } = require('sequelize');
const SlotAgendaStaffModel = require('../../../models/slotagendastaff');

describe('SlotAgendaStaff Model', () => {
  let SlotAgendaStaff;
  const sequelize = {}; 

  test('should initialize with correct attributes', () => {
    const { Model, DataTypes } = require('sequelize');
    const SlotAgendaStaffModel = require('../../../models/slotagendastaff');
    
    SlotAgendaStaff = SlotAgendaStaffModel(sequelize, DataTypes);
    
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
        id_user_staff: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        }),
        kehadiran: expect.objectContaining({
          type: expect.objectContaining({ values: ['hadir', 'tidak_hadir', 'izin'] })
        })
      }),
      expect.objectContaining({
        modelName: 'SlotAgendaStaff',
        tableName: 'SlotAgendaStaffs'
      })
    );
  });

  test('should define correct associations', () => {
    const { Model } = require('sequelize');
    const models = {
      SlotWaktu: { name: 'SlotWaktu' },
      User: { name: 'User' },
      Penugasan: { name: 'Penugasan' }
    };

    SlotAgendaStaff.associate(models);

    expect(Model.belongsTo).toHaveBeenCalledWith(models.SlotWaktu, expect.objectContaining({ as: 'slotWaktu' }));
    expect(Model.belongsTo).toHaveBeenCalledWith(models.User, expect.objectContaining({ as: 'staff' }));
    expect(Model.belongsTo).toHaveBeenCalledWith(models.Penugasan, expect.objectContaining({ as: 'penugasan' }));
  });
});
