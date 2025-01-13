import { type WorkspaceConfig } from './index';

describe('WorkspaceConfig', () => {
  it('should create a valid workspace config', () => {
    const config: WorkspaceConfig = {
      id: '123',
      name: 'Test Workspace'
    };
    
    expect(config.id).toBe('123');
    expect(config.name).toBe('Test Workspace');
  });
});