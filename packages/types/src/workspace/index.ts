export interface WorkspaceConfig {
  id: string;
  name: string;
  description?: string;
}

export interface Workspace {
  config: WorkspaceConfig;
  createdAt: Date;
  updatedAt: Date;
}
