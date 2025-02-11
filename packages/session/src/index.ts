import { createLogger } from '@mandrake/utils';

const logger = createLogger('session');

export interface SessionManager {
  // TBD: Interface for session management
}

export class DefaultSessionManager implements SessionManager {
  private logger = logger.child({ component: 'session-manager' });

  constructor() {
    this.logger.info('Initializing session manager');
  }
}