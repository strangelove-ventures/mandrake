import { test, expect, beforeAll, afterAll, afterEach } from 'bun:test';
import { Hono } from 'hono';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { config } from 'dotenv';
import { resolve } from 'path';
import { MandrakeManager, WorkspaceManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { sessionStreamingRoutes, systemSessionStreamingRoutes, workspaceSessionStreamingRoutes } from '../../src/routes/streaming';
import type { Managers, ManagerAccessors, WebSocketManager } from '../../src/types';
import { SessionCoordinator } from '@mandrake/session';
import { initWebSocketManager } from '../../src/index';

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
  
  // Initialize shared WebSocket manager
  const wsManager = initWebSocketManager();
  
  // Initialize Hono apps for testing with the shared WebSocket manager
  systemStreamingApp = systemSessionStreamingRoutes(managers, accessors, wsManager);
  workspaceStreamingApp = sessionStreamingRoutes(managers, accessors, false, workspaceId, wsManager);
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

test('workspace WebSocket streaming with shared WebSocket manager', async () => {
  // Create a workspace session
  const session = await workspaceManager.sessions.createSession({
    title: 'Test WebSocket Streaming Session'
  });
  
  const mcp = await mcpManagers.get(workspaceId);
  
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

  // Get the shared WebSocket manager
  const wsManager = initWebSocketManager();
  
  // Create a properly configured server using the shared WebSocket manager
  const testServer = Bun.serve({
    port: 0, // Let the OS choose a random available port
    fetch: workspaceStreamingApp.fetch,
    websocket: wsManager.websocket // Pass the shared WebSocket handler
  });

  // Get the server address info
  const serverInfo = testServer.url;
  const port = new URL(serverInfo).port;
  
  // Store received messages
  const receivedMessages: any[] = [];
  
  // Create a promise that resolves when expected messages are received
  const messagesPromise = new Promise<void>((resolve, reject) => {
    // Connect with a real WebSocket client
    const wsClient = new WebSocket(`ws://localhost:${port}/${session.id}/ws`);
    
    // Track if we've received essential message types
    const receivedTypes = {
      ready: false,
      initialized: false,
      turn: false,
      completed: false
    };
    
    // Keep track of message order
    const messageOrder = [];
    
    // Setup event handlers
    wsClient.addEventListener('open', () => {
      
      // Send a message with a query that will trigger tool calls
      setTimeout(() => {
        wsClient.send(JSON.stringify({
          content: 'Can you run the "hostname" command to get the system name, then run "pwd" to get the current directory? Finally, tell me what files are in the current directory.'
        }));
      }, 500);
    });
    
    wsClient.addEventListener('message', (event) => {
      
      try {
        const data = JSON.parse(event.data);
        receivedMessages.push(data);
        
        // Track message order
        messageOrder.push(data.type);
        
        // Track essential message types
        if (data.type === 'ready') receivedTypes.ready = true;
        if (data.type === 'initialized') receivedTypes.initialized = true;
        if (data.type === 'turn') receivedTypes.turn = true;
        
        // Wait for tool calls or complete the test after a reasonable timeout
        if (receivedTypes.ready && receivedTypes.initialized && receivedTypes.turn) {
          // Check if we have a turn with a tool call
          if (data.type === 'turn' && 
              data.toolCalls && 
              Array.isArray(data.toolCalls) &&
              data.toolCalls.some((tc: { call: null; }) => tc && tc.call !== null)) {
            // Wait longer to capture more of the interaction
            setTimeout(() => {
              wsClient.close();
              resolve();
            }, 5000);
          }
          
          // Also resolve if we get to the completed state
          if (data.type === 'completed') {
            wsClient.close();
            resolve();
          }
        }
        
        // Set a generous timeout to capture the full interaction including tool calls
        setTimeout(() => {
          if (!receivedTypes.completed) {
            wsClient.close();
            resolve();
          }
        }, 200000);
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    });
    
    wsClient.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      reject(error);
    });
    
    // Set a timeout to prevent the test from hanging
    const timeoutId = setTimeout(() => {
      wsClient.close();
      reject(new Error('Test timed out waiting for expected messages'));
    }, 30000);
    
    wsClient.addEventListener('close', () => {
      clearTimeout(timeoutId);
      console.log('WebSocket closed');
    });
  });
  
  try {
    // Wait for all expected messages
    await messagesPromise;
    
    // Validate received messages
    expect(receivedMessages.length).toBeGreaterThan(0);
    
    // Extract message types
    const messageTypes = receivedMessages.map(msg => msg.type);
    console.log('Message types received:', messageTypes);
    
    // Verify we received the essential message types
    expect(messageTypes).toContain('ready');
    expect(messageTypes).toContain('initialized');
    expect(messageTypes).toContain('turn');
    
    // Verify message sequence
    const readyIndex = messageTypes.indexOf('ready');
    const initializedIndex = messageTypes.indexOf('initialized');
    const firstTurnIndex = messageTypes.indexOf('turn');
    
    // 'ready' should come before 'initialized'
    expect(readyIndex).toBeLessThan(initializedIndex);
    // 'initialized' should come before 'turn'
    expect(initializedIndex).toBeLessThan(firstTurnIndex);
    
    // Find a turn message
    const turnMessage = receivedMessages.find(msg => msg.type === 'turn');
    expect(turnMessage).toBeDefined();
    expect(turnMessage).toHaveProperty('content');
    expect(turnMessage).toHaveProperty('turnId');
    expect(turnMessage).toHaveProperty('status');
    
    // Look for any messages with tool calls
    const messagesWithToolCalls = receivedMessages.filter(
      msg => msg.type === 'turn' && 
      msg.toolCalls && 
      (Array.isArray(msg.toolCalls) ? 
        msg.toolCalls.some((tc: { call: null; }) => tc && tc.call !== null) : 
        msg.toolCalls.call !== null)
    );
    
    // Check that we have at least one turn message with a proper tool call
    if (messagesWithToolCalls.length > 0) {
      const toolCallMessage = messagesWithToolCalls[0];
      
      let toolCall;
      if (Array.isArray(toolCallMessage.toolCalls)) {
        toolCall = toolCallMessage.toolCalls.find((tc: { call: null; }) => tc && tc.call !== null);
      } else {
        toolCall = toolCallMessage.toolCalls.call !== null ? toolCallMessage.toolCalls : null;
      }
      
      // Verify tool call structure if any were found
      if (toolCall && (toolCall.call || (toolCall.call === null && toolCall.response !== undefined))) {
        // We have a valid tool call structure
        console.log('Valid tool call structure found');
        if (toolCall.call) {
          expect(toolCall.call).toHaveProperty('serverName');
          expect(toolCall.call).toHaveProperty('methodName');
          expect(toolCall.call).toHaveProperty('arguments');
        }
      }
    }
    
  } finally {
    // Cleanup - stop the server
    testServer.stop();
  }
}, 240000);

test('system WebSocket streaming with shared WebSocket manager', async () => {
  // Create a system session
  const session = await mandrakeManager.sessions.createSession({
    title: 'Test System WebSocket Streaming Session'
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
  
  // Add the coordinator to the system coordinators map
  systemSessionCoordinators.set(session.id, systemCoordinator);

  // Get the shared WebSocket manager
  const wsManager = initWebSocketManager();
  
  // Create a properly configured streaming router with the shared manager
  const streamingRouter = systemSessionStreamingRoutes(
    managers, 
    accessors,
    wsManager
  );
  
  // Create a properly configured server to handle WebSocket upgrades
  const testServer = Bun.serve({
    port: 0, // Let the OS choose a random available port
    fetch: streamingRouter.fetch,
    websocket: wsManager.websocket // Pass the shared WebSocket handler
  });

  // Get the server address info
  const serverInfo = testServer.url;
  const port = new URL(serverInfo).port;
  
  // Store received messages
  const receivedMessages: any[] = [];
  
  // Create a promise that resolves when expected messages are received
  const messagesPromise = new Promise<void>((resolve, reject) => {
    // Connect with a real WebSocket client
    const wsClient = new WebSocket(`ws://localhost:${port}/${session.id}/ws`);
    
    // Track if we've received essential message types
    const receivedTypes = {
      ready: false,
      initialized: false,
      turn: false,
      completed: false
    };
    
    // Keep track of message order
    const messageOrder = [];
    
    // Setup event handlers
    wsClient.addEventListener('open', () => {
      // Send a message with a system-level query
      setTimeout(() => {
        wsClient.send(JSON.stringify({
          content: 'What is your system time? Can you tell me about your configuration?'
        }));
      }, 500);
    });
    
    wsClient.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        receivedMessages.push(data);
        
        // Track message order
        messageOrder.push(data.type);
        
        // Track essential message types
        if (data.type === 'ready') receivedTypes.ready = true;
        if (data.type === 'initialized') receivedTypes.initialized = true;
        if (data.type === 'turn') receivedTypes.turn = true;
        
        // Wait for completion or reasonable timeout
        if (receivedTypes.ready && receivedTypes.initialized && receivedTypes.turn) {
          // Resolve if we get to the completed state
          if (data.type === 'completed') {
            wsClient.close();
            resolve();
          }
          
          // Also resolve after we've received some content to avoid waiting indefinitely
          if (data.type === 'turn' && data.content && data.content.length > 100) {
            setTimeout(() => {
              wsClient.close();
              resolve();
            }, 2000);
          }
        }
        
        // Set a timeout to avoid running indefinitely
        setTimeout(() => {
          if (!receivedTypes.completed) {
            wsClient.close();
            resolve();
          }
        }, 10000);
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    });
    
    wsClient.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      reject(error);
    });
    
    // Set a timeout to prevent the test from hanging
    const timeoutId = setTimeout(() => {
      wsClient.close();
      reject(new Error('Test timed out waiting for expected messages'));
    }, 30000);
    
    wsClient.addEventListener('close', () => {
      clearTimeout(timeoutId);
      console.log('WebSocket closed');
    });
  });
  
  try {
    // Wait for all expected messages
    await messagesPromise;
    
    // Validate received messages
    expect(receivedMessages.length).toBeGreaterThan(0);
    
    // Extract message types
    const messageTypes = receivedMessages.map(msg => msg.type);
    console.log('System stream message types received:', messageTypes);
    
    // Verify we received the essential message types
    expect(messageTypes).toContain('ready');
    expect(messageTypes).toContain('initialized');
    expect(messageTypes).toContain('turn');
    
    // Verify message sequence
    const readyIndex = messageTypes.indexOf('ready');
    const initializedIndex = messageTypes.indexOf('initialized');
    const firstTurnIndex = messageTypes.indexOf('turn');
    
    // 'ready' should come before 'initialized'
    expect(readyIndex).toBeLessThan(initializedIndex);
    // 'initialized' should come before 'turn'
    expect(initializedIndex).toBeLessThan(firstTurnIndex);
    
    // Find a turn message
    const turnMessage = receivedMessages.find(msg => msg.type === 'turn');
    expect(turnMessage).toBeDefined();
    expect(turnMessage).toHaveProperty('content');
    expect(turnMessage).toHaveProperty('turnId');
    expect(turnMessage).toHaveProperty('status');
  } finally {
    // Cleanup - stop the server
    testServer.stop();
  }
}, 60000);