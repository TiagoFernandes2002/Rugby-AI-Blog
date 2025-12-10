// backend/jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: ['src/**/*.js', '!src/__tests__/**'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  verbose: true,
};
