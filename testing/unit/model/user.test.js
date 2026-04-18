const { Model, DataTypes } = require('sequelize');
const UserModel = require('../../../models/user');

describe('User Model', () => {
  let User;
  const sequelize = {}; 

  test('should initialize with correct attributes', () => {
    const { Model, DataTypes } = require('sequelize');
    const UserModel = require('../../../models/user');
    
    User = UserModel(sequelize, DataTypes);
    
    expect(Model.init).toHaveBeenCalledWith(
      expect.objectContaining({
        id_user: expect.objectContaining({ 
          allowNull: false, 
          primaryKey: true 
        }),
        id_role: expect.objectContaining({ 
          allowNull: false 
        }),
        nama: expect.objectContaining({ 
          allowNull: false 
        }),
        status_aktif: expect.objectContaining({
          type: expect.objectContaining({ values: ['aktif', 'nonaktif'] }),
          defaultValue: 'aktif'
        })
      }),
      expect.objectContaining({
        modelName: 'User',
        tableName: 'Users'
      })
    );
  });

  test('should define correct associations', () => {
    const { Model } = require('sequelize');
    const models = {
      Role: { name: 'Role' },
      Agenda: { name: 'Agenda' },
      StatusAgenda: { name: 'StatusAgenda' },
      PimpinanAjudan: { name: 'PimpinanAjudan' },
      SlotAgendaStaff: { name: 'SlotAgendaStaff' },
      DraftBerita: { name: 'DraftBerita' },
      LaporanKegiatan: { name: 'LaporanKegiatan' },
      Penugasan: { name: 'Penugasan' },
      NotificationSubscription: { name: 'NotificationSubscription' }
    };

    User.associate(models);

    expect(Model.belongsTo).toHaveBeenCalledWith(models.Role, expect.objectContaining({ foreignKey: 'id_role' }));
    expect(Model.hasMany).toHaveBeenCalledWith(models.Agenda, expect.objectContaining({ foreignKey: 'id_user_pemohon' }));
    expect(Model.hasMany).toHaveBeenCalledWith(models.StatusAgenda, expect.objectContaining({ foreignKey: 'id_user_sespri' }));
  });
});
