import baseConfig from '../../jest.config.base.js';

export default {
  ...baseConfig,
  displayName: 'langchain',
  rootDir: '.',
  moduleNameMapper: {
    '^@mandrake/(.*)$': '<rootDir>/../$1/dist'
  }
};