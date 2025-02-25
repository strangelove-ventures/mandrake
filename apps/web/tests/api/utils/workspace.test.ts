import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  setSystemWorkspaceManager, 
  getSystemWorkspaceManager,
  cacheWorkspaceManager,
  getWorkspaceManager
} from '@/lib/api/utils/workspace';
import { ApiError, ErrorCode } from '@/lib/api/middleware/errorHandling';

// Mock the WorkspaceManager from @mandrake/workspace
vi.mock('@mandrake/workspace', () => {
  return {
    WorkspaceManager: vi.fn().mockImplementation((dir, name) => {
      return {
        name,
        dir,
        paths: {
          root: `/workspaces/${name}`,
        },
        dynamic: {
          list: vi.fn().mockResolvedValue([]),
          get: vi.fn().mockResolvedValue(null),
          add: vi.fn(),
          update: vi.fn(),
          remove: vi.fn(),
        },
        tools: {
          list: vi.fn().mockResolvedValue([]),
        },
        models: {
          list: vi.fn().mockResolvedValue([]),
        }
      };
    }),
  };
});

describe('Workspace Utility', () => {
  // Mock workspace manager
  let mockSystemManager: any;
  let mockWorkspaceManager1: any;
  let mockWorkspaceManager2: any;
  
  beforeEach(() => {
    // Reset the workspace cache between tests by re-creating the mock functions
    mockSystemManager = {
      name: 'system',
      dir: '/system',
      listWorkspaces: vi.fn().mockResolvedValue([
        { id: 'ws1', name: 'workspace1', path: '/workspaces/workspace1' },
        { id: 'ws2', name: 'workspace2', path: '/workspaces/workspace2' }
      ])
    };
    
    mockWorkspaceManager1 = {
      name: 'workspace1',
      dir: '/workspaces/workspace1',
      paths: {
        root: '/workspaces/workspace1',
      }
    };
    
    mockWorkspaceManager2 = {
      name: 'workspace2',
      dir: '/workspaces/workspace2',
      paths: {
        root: '/workspaces/workspace2',
      }
    };
    
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
      cacheWorkspaceManager('ws1', mockWorkspaceManager1);
      
      // We need to make getWorkspaceManager not actually try to load anything
      // This is just to test our cache, so we'll mock the internal loadWorkspaceManager function
      vi.mock('@/lib/api/utils/workspace', async (importOriginal) => {
        const original = await importOriginal() as any;
        return {
          ...original,
          loadWorkspaceManager: vi.fn().mockRejectedValue(new Error('Should not be called'))
        };
      });
      
      setSystemWorkspaceManager(mockSystemManager);
      
      // Should get from cache without calling loadWorkspaceManager
      const manager = await getWorkspaceManager('ws1');
      expect(manager).toBe(mockWorkspaceManager1);
    });
  });

  // Note: getWorkspaceManager test relies on implementation of loadWorkspaceManager
  // which is currently not implemented. Here's a placeholder test:
  
  describe('getWorkspaceManager', () => {
    it('should throw if workspace not found', async () => {
      setSystemWorkspaceManager(mockSystemManager);
      
      // This will fail because loadWorkspaceManager isn't implemented
      await expect(getWorkspaceManager('nonexistent')).rejects.toThrow(ApiError);
    });
  });
});