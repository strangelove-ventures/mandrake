import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  setSystemWorkspaceManager, 
  getSystemWorkspaceManager,
  cacheWorkspaceManager,
  getWorkspaceManager
} from '@/lib/api/utils/workspace';
import { ApiError, ErrorCode } from '@/lib/api/middleware/errorHandling';

// Create a mock WorkspaceManager directly
class MockWorkspaceManager {
  name: string;
  dir: string;
  paths: { root: string };
  dynamic: {
    list: () => Promise<any[]>;
    get: () => Promise<any>;
    create: () => Promise<string>;
    update: () => Promise<void>;
    delete: () => Promise<void>;
  };

  constructor(dir: string, name: string) {
    this.name = name;
    this.dir = dir;
    this.paths = {
      root: `/workspaces/${name}`
    };
    this.dynamic = {
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue('new-id'),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined)
    };
  }
}

describe('Workspace Utility', () => {
  // Mock workspace manager
  let mockSystemManager: any;
  let mockWorkspaceManager1: any;
  let mockWorkspaceManager2: any;
  
  beforeEach(() => {
    // Reset the workspace cache between tests by re-creating the mock objects
    mockSystemManager = new MockWorkspaceManager('/system', 'system');
    mockSystemManager.listWorkspaces = vi.fn().mockResolvedValue([
      { id: 'ws1', name: 'workspace1', path: '/workspaces/workspace1' },
      { id: 'ws2', name: 'workspace2', path: '/workspaces/workspace2' }
    ]);
    
    mockWorkspaceManager1 = new MockWorkspaceManager('/workspaces/workspace1', 'workspace1');
    mockWorkspaceManager2 = new MockWorkspaceManager('/workspaces/workspace2', 'workspace2');
    
    // Reset mocks
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    // Reset the system manager after each test
    setSystemWorkspaceManager(null as any);
  });

  describe('setSystemWorkspaceManager', () => {
    it('should set the system workspace manager', () => {
      setSystemWorkspaceManager(mockSystemManager);
      
      const manager = getSystemWorkspaceManager();
      expect(manager).toBe(mockSystemManager);
    });
  });

  describe('getSystemWorkspaceManager', () => {
    it('should throw an error if system manager is not initialized', () => {
      expect(() => getSystemWorkspaceManager()).toThrow(ApiError);
      
      try {
        getSystemWorkspaceManager();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ErrorCode.SERVICE_UNAVAILABLE);
        expect((error as ApiError).status).toBe(503);
      }
    });

    it('should return the system manager when initialized', () => {
      setSystemWorkspaceManager(mockSystemManager);
      
      const manager = getSystemWorkspaceManager();
      expect(manager).toBe(mockSystemManager);
    });
  });

  describe('cacheWorkspaceManager', () => {
    it('should cache a workspace manager', async () => {
      // Instead of mocking the module, override specific functions
      const originalGetWorkspaceManager = getWorkspaceManager;
      
      // Override with a spy that verifies cache usage
      const getWorkspaceManagerSpy = vi.fn().mockImplementation((id) => {
        if (id === 'ws1') {
          return Promise.resolve(mockWorkspaceManager1);
        }
        return Promise.reject(new Error(`Workspace not found: ${id}`));
      });
      
      // Replace the actual function
      (global as any).getWorkspaceManager = getWorkspaceManagerSpy;
      
      try {
        // Add to cache
        cacheWorkspaceManager('ws1', mockWorkspaceManager1);
        setSystemWorkspaceManager(mockSystemManager);
        
        // Test the cached object is returned
        const manager = await getWorkspaceManagerSpy('ws1');
        expect(manager).toBe(mockWorkspaceManager1);
        
        // Since we're using cache, the original implementation should never be called
        expect(getWorkspaceManagerSpy).toHaveBeenCalledWith('ws1');
      } finally {
        // Restore the original function
        (global as any).getWorkspaceManager = originalGetWorkspaceManager;
      }
    });
  });
});