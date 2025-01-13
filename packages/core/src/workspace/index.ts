import type { Workspace, WorkspaceConfig } from '@mandrake/types';

export class WorkspaceManager {
  async createWorkspace(config: WorkspaceConfig): Promise<Workspace> {
    return {
      config,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}
