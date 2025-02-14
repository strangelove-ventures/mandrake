import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { type Logger, DefaultLogger } from '@mandrake/utils';
import { DockerContainer } from '../../src/docker/container';
import Docker from 'dockerode';

describe('DockerContainer', () => {
  let logger: Logger;
  let docker: Docker;

  beforeAll(async () => {
    logger = new DefaultLogger({ level: 'debug' });
    docker = new Docker();

    // Pre-pull image for all tests
    const container = new DockerContainer({
      id: 'test-fetch',
      name: 'test-fetch',
      image: 'ghcr.io/strangelove-ventures/mcp/fetch:latest'
    }, logger);

    await container.ensureImage();
  });

  test('should manage container lifecycle', async () => {
    const container = new DockerContainer({
      id: 'test-fetch',
      name: 'test-fetch',
      image: 'ghcr.io/strangelove-ventures/mcp/fetch:latest'
    }, logger);

    // Start container
    await container.start();
    expect(container.isStarted()).toBe(true);

    // Get Docker container and verify it's running
    const dockerContainer = container.getContainer();
    expect(dockerContainer).toBeDefined();
    
    if (dockerContainer) {
      const info = await dockerContainer.inspect();
      expect(info.State.Running).toBe(true);
    }

    // Cleanup
    await container.cleanup();
    expect(container.isStarted()).toBe(false);
    expect(container.getContainer()).toBeUndefined();
  });

  test('should handle cleanup of already stopped container', async () => {
    const container = new DockerContainer({
      id: 'test-fetch',
      name: 'test-fetch',
      image: 'ghcr.io/strangelove-ventures/mcp/fetch:latest'
    }, logger);

    await container.start();
    
    // Stop container directly
    const dockerContainer = container.getContainer();
    if (dockerContainer) {
      await dockerContainer.stop({ t: 0 }); // Force stop immediately
    }

    // Cleanup should still work
    await container.cleanup();
    expect(container.isStarted()).toBe(false);
  });

  test('should handle cleanup when container already removed', async () => {
    const container = new DockerContainer({
      id: 'test-fetch',
      name: 'test-fetch',
      image: 'ghcr.io/strangelove-ventures/mcp/fetch:latest'
    }, logger);

    await container.start();
    
    // Remove container directly
    const dockerContainer = container.getContainer();
    if (dockerContainer) {
      await dockerContainer.remove({ force: true });
    }

    // Cleanup should still work
    await container.cleanup();
    expect(container.isStarted()).toBe(false);
  });
});