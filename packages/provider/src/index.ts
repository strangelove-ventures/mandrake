import { createLogger } from '@mandrake/utils';

const logger = createLogger('provider');

export interface ProviderManager {
  // TBD: Interface for provider management
}

export class DefaultProviderManager implements ProviderManager {
  private logger = logger.child({ component: 'provider-manager' });

  constructor() {
    this.logger.info('Initializing provider manager');
  }
}