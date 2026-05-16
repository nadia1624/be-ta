module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/testing/integrated/**/*.test.js'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  setupFilesAfterEnv: ['./testing/setup.db.js']
};
