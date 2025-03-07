import { test, expect, beforeAll, afterAll, afterEach } from 'bun:test';
import { Hono } from 'hono';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { config } from 'dotenv';
import { resolve } from 'path';
import { MandrakeManager, WorkspaceManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { sessionStreamingRoutes, systemSessionStreamingRoutes } from '../../src/routes/streaming';
import type { Managers, ManagerAccessors } from '../../src/types';
import { SessionCoordinator } from '@mandrake/session';

// Setup for testing
let tempDir: string;
let mandrakeManager: MandrakeManager;
let workspaceManager: WorkspaceManager;
let systemStreamingApp: Hono;
let workspaceStreamingApp: Hono;
let workspaceId: string;
let managers: Managers;
let accessors: ManagerAccessors;

// Maps for storage
const workspaceManagers = new Map();
const mcpManagers = new Map();
const sessionCoordinators = new Map();
const systemSessionCoordinators = new Map();

// MCP managers to clean up after tests
const mcpManagersToCleanup: MCPManager[] = [];

// Helper function to check if a streaming response is valid
async function verifySSEResponse(response: Response): Promise<boolean> {
  return response.status === 200 && 
         response.headers.get('Content-Type') === 'text/event-stream';
}

// Helper function to set up MCP manager with ripper server
async function setupMcpManager(workspacePath: string): Promise<MCPManager> {
  const mcpManager = new MCPManager();
  
  // Start ripper server for file tools
  const serverConfigs = {
    ripper: {
      command: 'bun',
      args: [
        'run',
        '../ripper/dist/server.js',
        '--transport=stdio',
        `--workspaceDir=${workspacePath}`,
        '--excludePatterns=\\.ws'
      ]
    }
  };
  
  // Start the servers
  await Promise.all(
    Object.entries(serverConfigs).map(
      ([name, config]) => mcpManager.startServer(name, config)
    )
  );
  
  // Add to cleanup list
  mcpManagersToCleanup.push(mcpManager);
  
  return mcpManager;
}

beforeAll(async () => {
  config({ path: resolve(__dirname, '../../../../.env') });
  
  // Create temporary directory
  tempDir = mkdtempSync(join(tmpdir(), 'streaming-routes-test-'));
  
  // Initialize MandrakeManager for system level
  mandrakeManager = new MandrakeManager(tempDir);
  await mandrakeManager.init();
  
  // Set up API keys for providers
  await mandrakeManager.models.updateProvider('anthropic', {
    apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key'
  });
  
  await mandrakeManager.models.updateProvider('ollama', {
    apiKey: 'none',
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  });
  
  // Initialize a real MCPManager for system level
  const systemMcpManager = await setupMcpManager(mandrakeManager.paths.root);
  
  // Initialize workspace ID
  workspaceId = crypto.randomUUID();
  
  // Initialize WorkspaceManager for workspace level
  workspaceManager = new WorkspaceManager(tempDir, 'test-workspace', workspaceId);
  await workspaceManager.init('Test workspace');
  
  // Set up API keys for workspace providers too
  await workspaceManager.models.updateProvider('anthropic', {
    apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key'
  });
  
  await workspaceManager.models.updateProvider('ollama', {
    apiKey: 'none',
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  });
  
  // Initialize a workspace-level MCP manager
  const workspaceMcpManager = await setupMcpManager(workspaceManager.paths.root);

  // Add to maps
  workspaceManagers.set(workspaceId, workspaceManager);
  mcpManagers.set(workspaceId, workspaceMcpManager);
  
  // Set up empty coordinators maps
  sessionCoordinators.set(workspaceId, new Map());
  
  // Set up managers object with real managers
  managers = {
    mandrakeManager,
    systemMcpManager,
    systemSessionCoordinators,
    workspaceManagers,
    mcpManagers,
    sessionCoordinators
  };
  
  // Set up accessing functions
  accessors = {
    getWorkspaceManager: (id: string) => workspaceManagers.get(id),
    getMcpManager: (id: string) => mcpManagers.get(id),
    getSessionCoordinator: (wsId: string, sessionId: string) => {
      const map = sessionCoordinators.get(wsId);
      return map ? map.get(sessionId) : undefined;
    },
    getSessionCoordinatorMap: (wsId: string) => sessionCoordinators.get(wsId),
    createSessionCoordinator: (wsId: string, sessionId: string, coord: SessionCoordinator) => {
      let map = sessionCoordinators.get(wsId);
      if (!map) {
        map = new Map();
        sessionCoordinators.set(wsId, map);
      }
      map.set(sessionId, coord);
    },
    removeSessionCoordinator: (wsId: string, sessionId: string) => {
      const map = sessionCoordinators.get(wsId);
      if (map) {
        return map.delete(sessionId);
      }
      return false;
    }
  };
  
  // Initialize Hono apps for testing
  systemStreamingApp = systemSessionStreamingRoutes(managers, accessors);
  workspaceStreamingApp = sessionStreamingRoutes(managers, accessors, false, workspaceId);
});

afterEach(async () => {
  // Clean up any MCP managers created in individual tests
  for (const mcpManager of mcpManagersToCleanup) {
    await mcpManager.cleanup();
  }
  mcpManagersToCleanup.length = 0;
});

afterAll(() => {
  // Clean up
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.error('Error cleaning up temp directory:', error);
  }
});

test.skip('system API streaming should use coordinator streamRequest', async () => {
  // Create a system session
  const session = await mandrakeManager.sessions.createSession({
    title: 'Test System Streaming Session'
  });
  
  // Set up a system coordinator
  const systemCoordinator = new SessionCoordinator({
    metadata: {
      name: 'system',
      path: mandrakeManager.paths.root
    },
    promptManager: mandrakeManager.prompt,
    sessionManager: mandrakeManager.sessions,
    mcpManager: managers.systemMcpManager,
    modelsManager: mandrakeManager.models
  });
  
  // Add to the system coordinators map
  systemSessionCoordinators.set(session.id, systemCoordinator);
  
  // Make a simple streaming request
  const req = new Request(`http://localhost/${session.id}/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: 'Can you run the "hostname" command to get the system name, then run "pwd" to get the current directory, save both outputs to a file called "system_info.txt" in our workspace, and then confirm the file was created?'
    })
  });
  
  // Send the request to the API
  const res = await systemStreamingApp.fetch(req);
  
  // Verify it's a valid SSE response
  const isValid = await verifySSEResponse(res);
  expect(isValid).toBe(true);
  
  // Check the response content type
  const contentType = res.headers.get('Content-Type');
  expect(contentType).toBe('text/event-stream');
  
  // Allow some time for streaming to start
  await new Promise(resolve => setTimeout(resolve, 2000));
}, 240000);

test('workspace level streaming works properly', async () => {
  // Create a workspace session
  const session = await workspaceManager.sessions.createSession({
    title: 'Test Workspace Streaming Session'
  });
  const mcp = await mcpManagers.get(workspaceId)
  // console.log(await mcp.listAllTools())
  // Set up a workspace coordinator
  const workspaceCoordinator = new SessionCoordinator({
    metadata: {
      name: workspaceManager.name,
      path: workspaceManager.paths.root
    },
    promptManager: workspaceManager.prompt,
    sessionManager: workspaceManager.sessions,
    mcpManager: mcp,
    modelsManager: workspaceManager.models,
    filesManager: workspaceManager.files,
    dynamicContextManager: workspaceManager.dynamic
  });
  
  // Add the coordinator to the workspace coordinators map
  const coordMap = sessionCoordinators.get(workspaceId) || new Map();
  sessionCoordinators.set(workspaceId, coordMap);
  coordMap.set(session.id, workspaceCoordinator);

  // Make a simple streaming request
  const req = new Request(`http://localhost/${session.id}/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: 'Can you run the "hostname" command to get the system name, then run "pwd" to get the current directory, save both outputs to a file called "system_info.txt" in our workspace, and then confirm the file was created?'
    })
  });
  
  // Send the request to the API
  const res = await workspaceStreamingApp.fetch(req);
  
  // Verify it's a valid SSE response
  const isValid = await verifySSEResponse(res);
  expect(isValid).toBe(true);
  
  // Check the response content type
  const contentType = res.headers.get('Content-Type');
  expect(contentType).toBe('text/event-stream');
  
  // Allow some time for streaming to start
  await new Promise(resolve => setTimeout(resolve, 2000));
}, 240000);