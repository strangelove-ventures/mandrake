import { Hono } from 'hono';
import { SessionManager, WorkspaceManager, type Turn } from '@mandrake/workspace';
import { SessionCoordinator } from '@mandrake/session';
import { MCPManager } from '@mandrake/mcp';
import type { ManagerAccessors, Managers } from '../types';
import { sendError } from './utils';

/**
 * Helper function to get the correct resources for a session context
 */
function getSessionResources(
  isSystem: boolean,
  managers: Managers,
  accessors: ManagerAccessors,
  workspaceId?: string,
  workspaceManager?: WorkspaceManager
) {
  let sessionManager: SessionManager;
  let mcpManager: MCPManager;
  let workspace: WorkspaceManager | undefined;
  let coordinatorsMap: Map<string, SessionCoordinator>;
  let contextId: string; // system or workspace ID
  let contextName: string;
  let contextPath: string;
  
  if (isSystem) {
    // For system sessions
    sessionManager = managers.mandrakeManager.sessions;
    mcpManager = managers.systemMcpManager;
    coordinatorsMap = managers.systemSessionCoordinators;
    contextId = 'system';
    contextName = 'system';
    contextPath = managers.mandrakeManager.paths.root;
  } else {
    // For workspace sessions
    let wsId: string;
    
    if (workspaceManager && workspaceId) {
      // Use the provided workspace manager
      workspace = workspaceManager;
      wsId = workspaceId;
    } else {
      // Get workspace from managers
      wsId = workspaceId!; // Needs to be provided in this case
      workspace = accessors.getWorkspaceManager(wsId);
      
      if (!workspace) {
        throw new Error(`Workspace ${wsId} not found`);
      }
    }
    
    sessionManager = workspace.sessions;
    mcpManager = accessors.getMcpManager(wsId)!;
    coordinatorsMap = accessors.getSessionCoordinatorMap(wsId) || new Map();
    contextId = wsId;
    contextName = workspace.name;
    contextPath = workspace.paths.root;
  }
  
  return {
    sessionManager,
    mcpManager,
    workspace,
    coordinatorsMap,
    contextId,
    contextName,
    contextPath,
    
    // Helper to create a session coordinator
    createCoordinator: async (sessionId: string) => {
      let coordinator: SessionCoordinator;
      
      if (isSystem) {
        coordinator = new SessionCoordinator({
          metadata: { name: contextName, path: contextPath },
          sessionManager,
          mcpManager,
          modelsManager: managers.mandrakeManager.models,
          promptManager: managers.mandrakeManager.prompt
        });
      } else {
        if (!workspace) {
          throw new Error('Workspace not found');
        }
        
        coordinator = new SessionCoordinator({
          metadata: { name: workspace.name, path: workspace.paths.root },
          sessionManager,
          mcpManager,
          modelsManager: workspace.models,
          promptManager: workspace.prompt,
          dynamicContextManager: workspace.dynamic,
          filesManager: workspace.files
        });
      }
      
      // Store the coordinator
      if (isSystem) {
        managers.systemSessionCoordinators.set(sessionId, coordinator);
      } else {
        accessors.createSessionCoordinator(contextId, sessionId, coordinator);
      }
      
      return coordinator;
    },
    
    // Helper to get or create a coordinator
    getOrCreateCoordinator: async (sessionId: string) => {
      // Try to get existing coordinator
      let coordinator = isSystem
        ? managers.systemSessionCoordinators.get(sessionId)
        : accessors.getSessionCoordinator(contextId, sessionId);
      
      // Create a new coordinator if one doesn't exist
      if (!coordinator) {
        // First check if the session exists
        const session = await sessionManager.getSession(sessionId);
        if (!session) {
          throw new Error(`Session ${sessionId} not found`);
        }

        
        coordinator = await createCoordinator(sessionId);
      }
      
      return coordinator;
    },
    
    // Helper to remove a coordinator
    removeCoordinator: (sessionId: string) => {
      if (isSystem) {
        managers.systemSessionCoordinators.delete(sessionId);
      } else {
        accessors.removeSessionCoordinator(contextId, sessionId);
      }
    }
  };
}

/**
 * Create routes for system or workspace session management
 */
export function sessionsRoutes(
  managers: Managers,
  accessors: ManagerAccessors,
  isSystem: boolean = false,
  workspaceId?: string,
  workspaceManager?: WorkspaceManager
) {
  // Create a router
  const app = new Hono();
  
  // List all sessions
  app.get('/', async (c) => {
    try {
      const resources = getSessionResources(isSystem, managers, accessors, workspaceId, workspaceManager);
      const sessions = await resources.sessionManager.listSessions();
      return c.json(sessions);
    } catch (error) {
      return sendError(c, error, 'Failed to list sessions');
    }
  });
  
  // Get session details
  app.get('/:sessionId', async (c) => {
    const sessionId = c.req.param('sessionId');
    try {
      const resources = getSessionResources(isSystem, managers, accessors, workspaceId, workspaceManager);
      const session = await resources.sessionManager.getSession(sessionId);
      
      if (!session) {
        return c.json({ error: 'Session not found' }, 404);
      }
      
      return c.json(session);
    } catch (error) {
      return sendError(c, error, `Failed to get session ${sessionId}`);
    }
  });
  
  // Create a new session
  app.post('/', async (c) => {
    try {
      const resources = getSessionResources(isSystem, managers, accessors, workspaceId, workspaceManager);
      
      const { title } = await c.req.json();
      const session = await resources.sessionManager.createSession({ title: title || 'New Session' });
      
      // Create a coordinator for the new session
      await resources.createCoordinator(session.id);
      
      return c.json({
        id: session.id,
        title: session.title,
        created: session.createdAt
      }, 201);
    } catch (error) {
      return sendError(c, error, 'Failed to create session');
    }
  });
  
  // Delete a session
  app.delete('/:sessionId', async (c) => {
    const sessionId = c.req.param('sessionId');
    try {
      const resources = getSessionResources(isSystem, managers, accessors, workspaceId, workspaceManager);
      
      // Delete the session from the database
      await resources.sessionManager.deleteSession(sessionId);
      
      // Clean up the coordinator
      resources.removeCoordinator(sessionId);
      
      return c.json({ success: true, id: sessionId });
    } catch (error) {
      return sendError(c, error, `Failed to delete session ${sessionId}`);
    }
  });
  
  // List all turns in a session
  app.get('/:sessionId/turns', async (c) => {
    const sessionId = c.req.param('sessionId');
    try {
      const resources = getSessionResources(isSystem, managers, accessors, workspaceId, workspaceManager);
      const turns = await resources.sessionManager.listTurns(sessionId);
      return c.json(turns);
    } catch (error) {
      return sendError(c, error, `Failed to list turns for session ${sessionId}`);
    }
  });
  
  // Send a message and get streaming response
  app.post('/:sessionId/messages', async (c) => {
    const sessionId = c.req.param('sessionId');
    
    try {
      const resources = getSessionResources(isSystem, managers, accessors, workspaceId, workspaceManager);
      
      // Get or create a coordinator for this session
      const coordinator = await resources.getOrCreateCoordinator(sessionId);
      
      if (!coordinator) {
        return c.json({ error: 'Failed to get session coordinator' }, 500);
      }
      
      // Get the message from the request
      const { message } = await c.req.json();
      if (!message) {
        return c.json({ error: 'Message is required' }, 400);
      }
      
      // Process the message - this creates the request and response in the database
      // and returns the response ID
      const reqPromise = coordinator.handleRequest(sessionId, message);

      const rounds = await coordinator.opts.sessionManager.listRounds(sessionId)

      const round = rounds[0]
      
      // Set up headers for streaming
      const headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      };
      
      // Create a readable stream for the response
      const stream = new ReadableStream({
        start(controller) {
          // Function to send updates to the client
          const sendUpdate = () => {
            const eventData = `data: ${JSON.stringify(turn)}\n\n`;
            controller.enqueue(new TextEncoder().encode(eventData));
            
            // If the turn is completed, close the stream
            if (turn.status === 'completed') {
              controller.close();
            }
          };
          
          // Set up tracking for this response
          const stopTracking = resources.sessionManager.trackStreamingTurns(
            round.responseId, 
            sendUpdate
          );
          
          // Clean up tracking when the stream is cancelled
          c.req.raw.signal.addEventListener('abort', () => {
            stopTracking();
          });
        }
      });
      
      // Return the stream as an event stream
      return new Response(stream, { headers });
    } catch (error) {
      return sendError(c, error, 'Failed to process message');
    }
  });
  
  return app;
}

/**
 * Create routes for system sessions
 */
export function systemSessionsRoutes(managers: Managers, accessors: ManagerAccessors) {
  return sessionsRoutes(managers, accessors, true);
}

/**
 * Create routes for workspace sessions
 */
export function workspaceSessionsRoutes(
  managers: Managers, 
  accessors: ManagerAccessors, 
  workspaceId: string,
  workspaceManager?: WorkspaceManager
) {
  return sessionsRoutes(managers, accessors, false, workspaceId, workspaceManager);
}