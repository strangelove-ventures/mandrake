import { mkdir, rmdir } from 'fs/promises';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { 
  ServiceRegistryImpl, 
  ManagedService, 
  ServiceStatus,
  createAndRegisterService,
  createAndRegisterWorkspaceService
} from '../../../src/services/registry';
import { ConsoleLogger } from '@mandrake/utils';
import { tmpdir } from 'os';

/**
 * Simple test service implementation
 */
class TestService implements ManagedService {
  private initialized = false;
  
  constructor(
    private readonly name: string,
    private readonly options: { 
      initError?: boolean; 
      logMessages?: string[]
    } = {}
  ) {}
  
  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }
  
  async cleanup(): Promise<void> {
    this.initialized = false;
  }
  
  getStatus(): ServiceStatus {
    return {
      isHealthy: !this.options.initError,
      message: this.options.initError ? `Error in ${this.name}` : `${this.name} is healthy`,
      details: {
        name: this.name,
        initialized: this.initialized,
        logMessages: this.options.logMessages || []
      }
    };
  }
  
  getName(): string {
    return this.name;
  }
}

/**
 * Test service adapter implementation
 */
class TestServiceAdapter implements ManagedService {
  private initialized = false;
  
  constructor(
    private readonly service: TestService,
    private readonly options: { 
      logger?: any;
      workspaceId?: string;
      additionalOptions?: Record<string, any>;
    } = {}
  ) {}
  
  async init(): Promise<void> {
    if (this.initialized) return;
    await this.service.init();
    this.initialized = true;
  }
  
  isInitialized(): boolean {
    return this.initialized && this.service.isInitialized();
  }
  
  async cleanup(): Promise<void> {
    await this.service.cleanup();
    this.initialized = false;
  }
  
  getStatus(): ServiceStatus {
    const serviceStatus = this.service.getStatus();
    return {
      ...serviceStatus,
      details: {
        ...serviceStatus.details,
        adapterOptions: this.options,
        workspaceId: this.options.workspaceId
      }
    };
  }
  
  getService(): TestService {
    return this.service;
  }
  
  getOptions(): any {
    return this.options;
  }
}

describe('Service Registry Helpers', () => {
  let registry: ServiceRegistryImpl;
  let tempDir: string;
  
  beforeEach(async () => {
    registry = new ServiceRegistryImpl();
    
    // Create a temporary directory for the test
    tempDir = join(tmpdir(), `service-registry-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });
  
  afterEach(async () => {
    // Clean up temporary directory
    await rmdir(tempDir, { recursive: true });
  });
  
  test('should create and register service with createAndRegisterService', async () => {
    // Arrange
    const testService = new TestService('test-service');
    
    // Act
    const adapter = createAndRegisterService(
      registry,
      'test-service',
      TestServiceAdapter,
      {
        instance: testService,
        logger: new ConsoleLogger({ meta: { service: 'TestServiceAdapter' } }),
        options: {
          additionalOptions: { foo: 'bar' }
        }
      },
      {
        dependencies: [],
        initializationPriority: 100
      }
    );
    
    // Assert
    expect(adapter).toBeInstanceOf(TestServiceAdapter);
    expect(adapter.getService()).toBe(testService);
    expect(adapter.getOptions().additionalOptions).toEqual({ foo: 'bar' });
    
    // Verify the service is properly registered in the registry
    const retrievedService = registry.getService<TestServiceAdapter>('test-service');
    expect(retrievedService).toBe(adapter);
    
    // Initialize and verify
    await registry.initializeServices();
    expect(adapter.isInitialized()).toBe(true);
    expect(testService.isInitialized()).toBe(true);
  });
  
  test('should create and register workspace service with createAndRegisterWorkspaceService', async () => {
    // Arrange
    const testService = new TestService('workspace-service');
    const workspaceId = 'workspace-123';
    
    // Act
    const adapter = createAndRegisterWorkspaceService(
      registry,
      workspaceId,
      'test-service',
      TestServiceAdapter,
      {
        instance: testService,
        logger: new ConsoleLogger({ meta: { service: 'TestServiceAdapter' } }),
        options: {
          additionalOptions: { foo: 'bar' }
        }
      },
      {
        dependencies: [],
        initializationPriority: 100
      }
    );
    
    // Assert
    expect(adapter).toBeInstanceOf(TestServiceAdapter);
    expect(adapter.getService()).toBe(testService);
    expect(adapter.getOptions().workspaceId).toBe(workspaceId);
    
    // Verify the service is properly registered in the registry
    const retrievedService = registry.getWorkspaceService<TestServiceAdapter>(workspaceId, 'test-service');
    expect(retrievedService).toBe(adapter);
    
    // Initialize and verify
    await registry.initializeServices();
    expect(adapter.isInitialized()).toBe(true);
    expect(testService.isInitialized()).toBe(true);
    
    // Check service status
    const status = await registry.getServiceStatus('test-service', workspaceId);
    expect(status?.isHealthy).toBe(true);
    expect(status?.details?.workspaceId).toBe(workspaceId);
  });
  
  test('should respect service dependencies when using helpers', async () => {
    // Arrange
    const dependencyService = new TestService('dependency-service');
    const dependentService = new TestService('dependent-service');
    
    // Act - Create dependency first
    const dependencyAdapter = createAndRegisterService(
      registry,
      'dependency-service',
      TestServiceAdapter,
      {
        instance: dependencyService
      },
      {
        initializationPriority: 10 // Lower priority
      }
    );
    
    // Create dependent service that depends on the first
    const dependentAdapter = createAndRegisterService(
      registry,
      'dependent-service',
      TestServiceAdapter,
      {
        instance: dependentService
      },
      {
        dependencies: ['dependency-service'],
        initializationPriority: 20 // Higher priority, but dependency should still go first
      }
    );
    
    // Initialize all services
    await registry.initializeServices();
    
    // Assert
    expect(dependencyAdapter.isInitialized()).toBe(true);
    expect(dependentAdapter.isInitialized()).toBe(true);
  });
  
  test('should properly pass constructor options to the adapter', async () => {
    // Arrange
    const testService = new TestService('config-test');
    const logMessages = ['test message 1', 'test message 2'];
    
    // Act
    const adapter = createAndRegisterService(
      registry,
      'config-test',
      TestServiceAdapter,
      {
        instance: testService,
        options: {
          additionalOptions: { 
            config: { setting1: 'value1' },
            logMessages
          }
        }
      }
    );
    
    // Assert
    expect(adapter.getOptions().additionalOptions.config).toEqual({ setting1: 'value1' });
    expect(adapter.getOptions().additionalOptions.logMessages).toEqual(logMessages);
  });
  
  test('should handle metadata in createAndRegisterService', async () => {
    // Arrange
    const testService = new TestService('metadata-test');
    const metadata = { version: '1.0.0', author: 'Test Author' };
    
    // Act
    const adapter = createAndRegisterService(
      registry,
      'metadata-test',
      TestServiceAdapter,
      {
        instance: testService,
        metadata
      },
      {
        metadata
      }
    );
    
    // Assert
    expect(adapter.getOptions().version).toBe('1.0.0');
    expect(adapter.getOptions().author).toBe('Test Author');
    
    // Initialize registry
    await registry.initializeServices();
    
    // Check status contains metadata
    const status = await registry.getServiceStatus('metadata-test');
    expect(status?.details?.adapterOptions).toMatchObject({ 
      version: '1.0.0', 
      author: 'Test Author' 
    });
  });
});