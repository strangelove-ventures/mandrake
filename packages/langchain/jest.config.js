import baseConfig from '../../jest.config.base.js';

export default {
  ...baseConfig,
  displayName: 'langchain',
  rootDir: '.',
  moduleDirectories: ['node_modules', '../../node_modules'],
  transformIgnorePatterns: [
    'node_modules/(?!@mandrake/.*)'
  ],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@mandrake/mcp$': '<rootDir>/../mcp/dist',
    '^@mandrake/types$': '<rootDir>/../types/dist'
  },
  setupFiles: ['<rootDir>/jest.setup.js']
}
