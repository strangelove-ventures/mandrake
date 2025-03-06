import { test, expect, beforeAll, afterAll } from 'bun:test';
import { Hono } from 'hono';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
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

// Helper function to check if a streaming response is valid
async function isStreamingResponseValid(response: Response): Promise<boolean> {
  return response.status === 200 && 
         response.headers.get('Content-Type') === 'text/event-stream';
}

beforeAll(async () => {
  // Create temporary directory
  tempDir = mkdtempSync(join(tmpdir(), 'streaming-routes-test-'));
  
  // Initialize a real MandrakeManager for system level
  mandrakeManager = new MandrakeManager(tempDir);
  await mandrakeManager.init();
  
  // Initialize a real MCPManager for system level
  const systemMcpManager = new MCPManager();
  
  // Initialize workspace ID
  workspaceId = crypto.randomUUID();
  
  // Initialize a real WorkspaceManager for workspace level
  workspaceManager = new WorkspaceManager(tempDir, 'test-workspace', workspaceId);
  await workspaceManager.init('Test workspace');
  
  // Add to maps
  workspaceManagers.set(workspaceId, workspaceManager);
  
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
    createSessionCoordinator: (wsId: string, sessionId: string, coordinator: SessionCoordinator) => {
      let map = sessionCoordinators.get(wsId);
      if (!map) {
        map = new Map();
        sessionCoordinators.set(wsId, map);
      }
      map.set(sessionId, coordinator);
    },
    removeSessionCoordinator: (wsId: string, sessionId: string) => {
      const map = sessionCoordinators.get(wsId);
      if (map) {
        return map.delete(sessionId);
      }
      return false;
    }
  };
  
  // Set up session coordinators map for workspace
  sessionCoordinators.set(workspaceId, new Map());
  
  // Initialize Hono apps for testing
  systemStreamingApp = systemSessionStreamingRoutes(managers, accessors);
  workspaceStreamingApp = sessionStreamingRoutes(managers, accessors, false, workspaceId);
});

afterAll(() => {
  // Clean up
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.error('Error cleaning up temp directory:', error);
  }
});

test('system session request streaming should return proper SSE format', async () => {
  // Create a session
  const session = await mandrakeManager.sessions.createSession({
    title: 'Test Streaming Session'
  });
  
  // Create a mock coordinator that will be used by the streaming endpoint
  const coordinator = new SessionCoordinator({
    metadata: {
      name: 'system',
      path: mandrakeManager.paths.root
    },
    promptManager: mandrakeManager.prompt,
    sessionManager: mandrakeManager.sessions,
    mcpManager: managers.systemMcpManager,
    modelsManager: mandrakeManager.models,
    filesManager: mandrakeManager.files,
    dynamicContextManager: mandrakeManager.dynamic
  });
  
  // Add the coordinator to the system coordinators map
  systemSessionCoordinators.set(session.id, coordinator);
  
  // Make the request
  const req = new Request(`http://localhost/${session.id}/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: 'Hello, world!'
    })
  });
  
  const res = await systemStreamingApp.fetch(req);
  
  // Check response headers only
  const isValid = await isStreamingResponseValid(res);
  expect(isValid).toBe(true);
});

test('workspace session streaming should handle streaming existing responses', async () => {
  // Create a session
  const session = await workspaceManager.sessions.createSession({
    title: 'Test Workspace Streaming Session'
  });
  
  // Create a round with request and response
  const round = await workspaceManager.sessions.createRound({
    sessionId: session.id,
    content: 'Test request'
  });
  
  // Create a turn
  const turn = await workspaceManager.sessions.createTurn({
    responseId: round.responseId,
    index: 0,
    content: 'Initial content',
    rawResponse: 'Initial content',
    toolCalls: '[]',
    status: 'streaming',
    inputTokens: 0,
    outputTokens: 0,
    inputCost: 0,
    outputCost: 0
  });
  
  // Make the streaming request
  const req = new Request(`http://localhost/responses/${round.responseId}/stream`, {
    method: 'GET'
  });
  
  const res = await workspaceStreamingApp.fetch(req);
  
  // Check response headers only
  const isValid = await isStreamingResponseValid(res);
  expect(isValid).toBe(true);
});