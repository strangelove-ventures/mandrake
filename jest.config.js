export default {
  projects: [
    '<rootDir>/packages/types',
    '<rootDir>/packages/ui',
    '<rootDir>/packages/core',
    '<rootDir>/packages/langchain',
    '<rootDir>/packages/mcp',
    '<rootDir>/packages/storage'
  ],
  collectCoverageFrom: [
    'packages/*/src/**/*.{ts,tsx}',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/__tests__/**'
  ],
  coverageDirectory: '<rootDir>/coverage',
  verbose: true
};