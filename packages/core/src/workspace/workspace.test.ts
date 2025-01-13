import { WorkspaceManager } from './index';

describe('WorkspaceManager', () => {
  it('should create a workspace with given config', async () => {
    const manager = new WorkspaceManager();
    const config = {
      id: '123',
      name: 'Test Workspace'
    };
    
    const workspace = await manager.createWorkspace(config);
    
    expect(workspace.config).toEqual(config);
    expect(workspace.createdAt).toBeInstanceOf(Date);
    expect(workspace.updatedAt).toBeInstanceOf(Date);
  });
});