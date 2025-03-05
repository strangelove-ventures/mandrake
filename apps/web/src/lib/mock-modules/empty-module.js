// Mock implementation for bun:sqlite
module.exports = {
  Database: class MockDatabase {
    constructor() {
      console.warn('Mock SQLite Database created - not functional in browser');
    }
    
    prepare() {
      return {
        all: () => [],
        get: () => null,
        run: () => null
      };
    }
    
    close() {}
  }
};
