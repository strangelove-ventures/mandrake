import { createLogger } from '@mandrake/utils';

const logger = createLogger('mcp');

export interface DockerMCPService {
  // TBD: Interface for Docker MCP service
}

export class DefaultDockerMCPService implements DockerMCPService {
  private logger = logger.child({ component: 'docker-mcp-service' });

  constructor() {
    this.logger.info('Initializing Docker MCP service');
  }
}