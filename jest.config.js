module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/testing/**/*.test.js'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  setupFilesAfterEnv: ['./testing/setup.js']
};
