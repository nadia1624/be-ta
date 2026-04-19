const { Model, DataTypes } = jest.requireActual('sequelize');

class MockModel extends Model {}
MockModel.init = jest.fn().mockImplementation(function() { return this; });
MockModel.belongsTo = jest.fn();
MockModel.hasMany = jest.fn();
MockModel.belongsToMany = jest.fn();
MockModel.hasOne = jest.fn();

// Mock sequelize
jest.mock('sequelize', () => {
  const actual = jest.requireActual('sequelize');
  
  // Create a mock constructor
  const MockSequelize = jest.fn().mockImplementation(() => ({
    define: jest.fn().mockReturnValue(global.MockModel),
    authenticate: jest.fn().mockResolvedValue(),
    sync: jest.fn().mockResolvedValue(),
    transaction: jest.fn().mockImplementation(() => ({
      commit: jest.fn().mockResolvedValue(),
      rollback: jest.fn().mockResolvedValue(),
      LOCK: { UPDATE: 'UPDATE' }
    })),
    import: jest.fn()
  }));

  // Attach properties to the constructor
  MockSequelize.Model = global.MockModel;
  MockSequelize.DataTypes = actual.DataTypes;
  MockSequelize.Op = actual.Op;
  MockSequelize.Sequelize = MockSequelize;

  return MockSequelize;
});

global.MockModel = MockModel;
global.DataTypes = DataTypes;

// Mock web-push globally to avoid VAPID key validation errors during module require
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
  generateVAPIDKeys: jest.fn(() => ({ publicKey: 'pk', privateKey: 'sk' }))
}));
