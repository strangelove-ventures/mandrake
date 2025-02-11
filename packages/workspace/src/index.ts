import { createLogger } from '@mandrake/utils';

const logger = createLogger('workspace');

export interface WorkspaceManager {
  // TBD: Interface for workspace management
}

export class DefaultWorkspaceManager implements WorkspaceManager {
  private logger = logger.child({ component: 'workspace-manager' });

  constructor() {
    this.logger.info('Initializing workspace manager');
  }
}