import baseConfig from '../../jest.config.base.js';

export default {
  ...baseConfig,
  displayName: 'mcp',
  rootDir: '.',
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.test.json'
    }
  }
}