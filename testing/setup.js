const { Model, DataTypes } = jest.requireActual('sequelize');

class MockModel extends Model {}
MockModel.init = jest.fn().mockImplementation(function() { return this; });
MockModel.belongsTo = jest.fn();
MockModel.hasMany = jest.fn();
MockModel.belongsToMany = jest.fn();
MockModel.hasOne = jest.fn();

// Use jest.mock at the top level of the setup file
jest.mock('sequelize', () => {
  const actual = jest.requireActual('sequelize');
  return {
    ...actual,
    Model: MockModel,
    DataTypes: actual.DataTypes,
    Sequelize: jest.fn().mockImplementation(() => ({
      define: jest.fn().mockReturnValue(MockModel),
      import: jest.fn()
    }))
  };
});

global.MockModel = MockModel;
global.DataTypes = DataTypes;

// Mock web-push globally to avoid VAPID key validation errors during module require
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
  generateVAPIDKeys: jest.fn(() => ({ publicKey: 'pk', privateKey: 'sk' }))
}));
