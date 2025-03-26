import { mkdir, rmdir } from 'fs/promises';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { ServiceRegistryImpl, ManagedService, ServiceStatus } from '../../../src/services/registry';
import { ConsoleLogger } from '@mandrake/utils';
import { tmpdir } from 'os';

/**
 * Simple test service implementation
 */
class TestService implements ManagedService {
  private initialized = false;
  private static initCounter = 0;
  private static cleanupCounter = 0;
  private initIndex = -1;
  private cleanupIndex = -1;
  private error: Error | null = null;
  
  constructor(
    private readonly name: string,
    private readonly options: {
      initError?: boolean;
      cleanupError?: boolean;
      throwOn?: 'init' | 'cleanup';
      resetStateOnCleanupError?: boolean; // If true, will still reset initialized state even on error
    } = {
      resetStateOnCleanupError: true // Default to true for tests
    }
  ) {}
  
  async init(): Promise<void> {
    if (this.initialized) return;
    
    // Record initialization order using a static counter
    this.initIndex = TestService.initCounter++;
    
    // Simulate initialization error if requested
    if (this.options.initError) {
      this.error = new Error(`Init error for ${this.name}`);
    }

    // Throw error if requested
    if (this.options.throwOn === 'init') {
      throw new Error(`Thrown init error for ${this.name}`);
    }
    
    this.initialized = true;
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }
  
  async cleanup(): Promise<void> {
    if (!this.initialized) return;
    
    // Record cleanup order using a static counter
    this.cleanupIndex = TestService.cleanupCounter++;
    
    try {
      // Simulate cleanup error if requested
      if (this.options.cleanupError) {
        this.error = new Error(`Cleanup error for ${this.name}`);
      }
  
      // Throw error if requested
      if (this.options.throwOn === 'cleanup') {
        throw new Error(`Thrown cleanup error for ${this.name}`);
      }
      
      this.initialized = false;
    } catch (error) {
      // Still mark as not initialized if resetStateOnCleanupError is true
      if (this.options.resetStateOnCleanupError) {
        this.initialized = false;
      }
      
      // Rethrow the error
      throw error;
    }
  }
  
  async getStatus(): Promise<ServiceStatus> {
    return {
      isHealthy: !this.error,
      message: this.error ? this.error.message : undefined,
      details: {
        name: this.name,
        initialized: this.initialized,
        initIndex: this.initIndex,
        cleanupIndex: this.cleanupIndex
      }
    };
  }
  
  getInitIndex(): number {
    return this.initIndex;
  }
  
  getCleanupIndex(): number {
    return this.cleanupIndex;
  }
  
  // Reset the static counters for each test
  static resetCounters(): void {
    TestService.initCounter = 0;
    TestService.cleanupCounter = 0;
  }
}

describe('ServiceRegistry', () => {
  let registry: ServiceRegistryImpl;
  let tempDir: string;
  
  beforeEach(async () => {
    registry = new ServiceRegistryImpl();
    
    // Create a temporary directory for the test
    tempDir = join(tmpdir(), `service-registry-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    
    // Reset test service counters before each test
    TestService.resetCounters();
  });
  
  afterEach(async () => {
    // Clean up temporary directory
    await rmdir(tempDir, { recursive: true });
  });
  
  test('should register and retrieve services', () => {
    // Arrange
    const configService = new TestService('config');
    const sessionService = new TestService('session');
    
    // Act
    registry.registerService('config', configService);
    registry.registerService('session', sessionService);
    
    // Assert
    expect(registry.getService('config')).toBe(configService);
    expect(registry.getService('session')).toBe(sessionService);
    expect(registry.getService('unknown')).toBeNull();
  });
  
  test('should register and retrieve workspace services', () => {
    // Arrange
    const configService = new TestService('config');
    const workspaceConfigService = new TestService('workspaceConfig');
    
    // Act
    registry.registerService('config', configService);
    registry.registerWorkspaceService('workspace1', 'config', workspaceConfigService);
    
    // Assert
    expect(registry.getService('config')).toBe(configService);
    expect(registry.getWorkspaceService('workspace1', 'config')).toBe(workspaceConfigService);
    expect(registry.getWorkspaceService('workspace2', 'config')).toBeNull();
  });
  
  test('should initialize services in dependency order', async () => {
    // Arrange
    const configService = new TestService('config');
    const toolsService = new TestService('tools');
    const sessionService = new TestService('session');
    
    // Register services with dependencies
    registry.registerService('config', configService);
    registry.registerService('tools', toolsService, {
      dependencies: ['config']
    });
    registry.registerService('session', sessionService, {
      dependencies: ['config', 'tools']
    });
    
    // Act
    await registry.initializeServices();
    
    // Assert
    expect(configService.isInitialized()).toBe(true);
    expect(toolsService.isInitialized()).toBe(true);
    expect(sessionService.isInitialized()).toBe(true);
    
    // Check initialization order (config should be before tools and session)
    const configInitIndex = configService.getInitIndex();
    const toolsInitIndex = toolsService.getInitIndex();
    const sessionInitIndex = sessionService.getInitIndex();
    
    expect(configInitIndex).toBeLessThan(toolsInitIndex);
    expect(toolsInitIndex).toBeLessThan(sessionInitIndex);
  });
  
  test('should clean up services in reverse dependency order', async () => {
    // Arrange
    const configService = new TestService('config');
    const toolsService = new TestService('tools');
    const sessionService = new TestService('session');
    
    // Register services with dependencies
    registry.registerService('config', configService);
    registry.registerService('tools', toolsService, {
      dependencies: ['config']
    });
    registry.registerService('session', sessionService, {
      dependencies: ['config', 'tools']
    });
    
    // Initialize
    await registry.initializeServices();
    
    // Act
    await registry.cleanupServices();
    
    // Assert
    expect(configService.isInitialized()).toBe(false);
    expect(toolsService.isInitialized()).toBe(false);
    expect(sessionService.isInitialized()).toBe(false);
    
    // Check cleanup order (session should be before tools and config in cleanup)
    const sessionCleanupIndex = sessionService.getCleanupIndex();
    const toolsCleanupIndex = toolsService.getCleanupIndex();
    const configCleanupIndex = configService.getCleanupIndex();
    
    expect(sessionCleanupIndex).toBeLessThan(toolsCleanupIndex);
    expect(toolsCleanupIndex).toBeLessThan(configCleanupIndex);
  });
  
  test('should initialize and clean up workspace services', async () => {
    // Arrange
    const configService = new TestService('config');
    const workspaceConfigService = new TestService('workspaceConfig');
    const workspaceToolsService = new TestService('workspaceTools');
    
    // Register services with dependencies
    registry.registerService('config', configService);
    registry.registerWorkspaceService('workspace1', 'config', workspaceConfigService);
    registry.registerWorkspaceService('workspace1', 'tools', workspaceToolsService, {
      dependencies: ['config'] // This will resolve to the workspace config
    });
    
    // Act - Initialize
    await registry.initializeServices();
    
    // Assert - Initialization
    expect(configService.isInitialized()).toBe(true);
    expect(workspaceConfigService.isInitialized()).toBe(true);
    expect(workspaceToolsService.isInitialized()).toBe(true);
    
    // Act - Clean up
    await registry.cleanupServices();
    
    // Assert - Cleanup
    expect(configService.isInitialized()).toBe(false);
    expect(workspaceConfigService.isInitialized()).toBe(false);
    expect(workspaceToolsService.isInitialized()).toBe(false);
  });
  
  test('should respect initialization priority', async () => {
    // Arrange
    const service1 = new TestService('service1');
    const service2 = new TestService('service2');
    const service3 = new TestService('service3');
    
    // Register services with priorities but no dependencies
    registry.registerService('service1', service1, { 
      initializationPriority: 1 // Lower priority
    });
    registry.registerService('service2', service2, { 
      initializationPriority: 3 // Highest priority 
    });
    registry.registerService('service3', service3, { 
      initializationPriority: 2 // Medium priority
    });
    
    // Act
    await registry.initializeServices();
    
    // Assert
    // Initialization should be service2 -> service3 -> service1
    const service2Index = service2.getInitIndex();
    const service3Index = service3.getInitIndex();
    const service1Index = service1.getInitIndex();
    
    // Higher priority should be initialized first
    expect(service2Index).toBeLessThan(service3Index);
    expect(service3Index).toBeLessThan(service1Index);
  });
  
  test('should throw error when initialization fails', async () => {
    // Arrange
    const configService = new TestService('config');
    const errorService = new TestService('error', { throwOn: 'init' });
    
    // Register services
    registry.registerService('config', configService);
    registry.registerService('error', errorService, {
      dependencies: ['config']
    });
    
    // Act & Assert
    await expect(registry.initializeServices()).rejects.toThrow('Service initialization failed');
    
    // Config should be initialized but error service should not
    expect(configService.isInitialized()).toBe(true);
    expect(errorService.isInitialized()).toBe(false);
  });
  
  test('should continue cleanup even when errors occur', async () => {
    // Arrange
    const configService = new TestService('config');
    const errorService = new TestService('error', { 
      throwOn: 'cleanup',
      resetStateOnCleanupError: true // This ensures it gets marked as uninitialized
    });
    const sessionService = new TestService('session');
    
    // Register services with dependencies
    registry.registerService('config', configService);
    registry.registerService('error', errorService, {
      dependencies: ['config']
    });
    registry.registerService('session', sessionService, {
      dependencies: ['error']
    });
    
    // Initialize
    await registry.initializeServices();
    
    // Act - Errors will be collected but all services will still be cleaned up
    let cleanupError: Error | null = null;
    try {
      await registry.cleanupServices();
    } catch (error) {
      cleanupError = error as Error;
    }
    
    // Assert - Should have thrown an error
    expect(cleanupError).not.toBeNull();
    expect(cleanupError?.message).toContain('Some services failed to clean up properly');
    
    // All services should be cleaned up despite the error
    expect(sessionService.isInitialized()).toBe(false);
    expect(errorService.isInitialized()).toBe(false);
    expect(configService.isInitialized()).toBe(false);
  });
  
  test('should get service status', async () => {
    // Arrange
    const configService = new TestService('config');
    const errorService = new TestService('error', { initError: true });
    
    // Register services
    registry.registerService('config', configService);
    registry.registerService('error', errorService);
    
    // Initialize
    await registry.initializeServices();
    
    // Act
    const configStatus = await registry.getServiceStatus('config');
    const errorStatus = await registry.getServiceStatus('error');
    const allStatuses = await registry.getAllServiceStatuses();
    
    // Assert
    expect(configStatus?.isHealthy).toBe(true);
    expect(errorStatus?.isHealthy).toBe(false);
    expect(errorStatus?.message).toContain('Init error for error');
    
    expect(allStatuses.size).toBe(2);
    expect(allStatuses.get('config')?.isHealthy).toBe(true);
    expect(allStatuses.get('error')?.isHealthy).toBe(false);
  });
});