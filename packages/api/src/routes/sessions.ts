import { Hono } from 'hono';
import { SessionManager, WorkspaceManager } from '@mandrake/workspace';
import type { ManagerAccessors, Managers } from '../types';
import { sendError } from './utils';
import type {
  SessionResponse,
  SessionListResponse,
  CreateSessionRequest,
  UpdateSessionRequest,
  CreateRoundRequest,
  RoundResponse,
  RoundListResponse,
  TurnListResponse,
  TurnResponse,
  TurnWithToolCallsResponse,
  SessionHistoryResponse
} from '@mandrake/utils/src/types/api';

/**
 * Helper function to get the correct session manager
 */
function getSessionManager(
  isSystem: boolean,
  managers: Managers,
  accessors: ManagerAccessors,
  workspaceId?: string,
  workspaceManager?: WorkspaceManager
): SessionManager {
  if (isSystem) {
    // For system sessions
    return managers.mandrakeManager.sessions;
  } else {
    // For workspace sessions
    let workspace: WorkspaceManager | undefined;
    
    if (workspaceManager && workspaceId) {
      // Use the provided workspace manager
      workspace = workspaceManager;
    } else {
      // Get workspace from managers
      const wsId = workspaceId!; // Needs to be provided in this case
      workspace = accessors.getWorkspaceManager(wsId);
      
      if (!workspace) {
        throw new Error(`Workspace ${wsId} not found`);
      }
    }
    
    return workspace.sessions;
  }
}

/**
 * Create routes for session database access (CRUD operations)
 * These routes only handle the database operations and do not include
 * any session coordination or streaming functionality.
 */
export function sessionDatabaseRoutes(
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
      const sessionManager = getSessionManager(isSystem, managers, accessors, workspaceId, workspaceManager);
      const sessions = await sessionManager.listSessions();
      
      // Convert to SessionResponse objects by parsing metadata
      const sessionList: SessionListResponse = sessions.map(session => ({
        ...session,
        metadata: typeof session.metadata === 'string' 
          ? JSON.parse(session.metadata) 
          : session.metadata || {}
      }));
      
      return c.json(sessionList);
    } catch (error) {
      return sendError(c, error, 'Failed to list sessions');
    }
  });
  
  // Get session details
  app.get('/:sessionId', async (c) => {
    const sessionId = c.req.param('sessionId');
    try {
      const sessionManager = getSessionManager(isSystem, managers, accessors, workspaceId, workspaceManager);
      const session = await sessionManager.getSession(sessionId);
      
      // Convert to SessionResponse with parsed metadata
      const response: SessionResponse = {
        ...session,
        metadata: typeof session.metadata === 'string' 
          ? JSON.parse(session.metadata) 
          : session.metadata || {}
      };
      
      return c.json(response);
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        return c.json({ error: 'Session not found' }, 404);
      }
      return sendError(c, error, `Failed to get session ${sessionId}`);
    }
  });
  
  // Create a new session
  app.post('/', async (c) => {
    try {
      const sessionManager = getSessionManager(isSystem, managers, accessors, workspaceId, workspaceManager);
      
      const data = await c.req.json() as CreateSessionRequest;
      const { title, description, metadata } = data;
      
      const session = await sessionManager.createSession({ 
        title: title || 'New Session',
        description,
        metadata 
      });
      
      // Convert to SessionResponse
      const response: SessionResponse = {
        id: session.id,
        title: session.title,
        description: session.description,
        metadata: session.metadata ? JSON.parse(session.metadata) : {},
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      };
      
      return c.json(response, 201);
    } catch (error) {
      return sendError(c, error, 'Failed to create session');
    }
  });
  
  // Update a session
  app.put('/:sessionId', async (c) => {
    const sessionId = c.req.param('sessionId');
    try {
      const sessionManager = getSessionManager(isSystem, managers, accessors, workspaceId, workspaceManager);
      
      const data = await c.req.json() as UpdateSessionRequest;
      const { title, description, metadata } = data;
      
      const session = await sessionManager.updateSession(sessionId, {
        title,
        description,
        metadata
      });
      
      // Convert to SessionResponse
      const response: SessionResponse = {
        id: session.id,
        title: session.title,
        description: session.description,
        metadata: session.metadata ? JSON.parse(session.metadata as string) : {},
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      };
      
      return c.json(response);
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        return c.json({ error: 'Session not found' }, 404);
      }
      return sendError(c, error, `Failed to update session ${sessionId}`);
    }
  });
  
  // Delete a session
  app.delete('/:sessionId', async (c) => {
    const sessionId = c.req.param('sessionId');
    try {
      const sessionManager = getSessionManager(isSystem, managers, accessors, workspaceId, workspaceManager);
      
      // Delete the session from the database
      await sessionManager.deleteSession(sessionId);
      
      // Return standard delete response
      return c.json({
        success: true,
        id: sessionId,
        message: "Session deleted successfully"
      });
    } catch (error) {
      return sendError(c, error, `Failed to delete session ${sessionId}`);
    }
  });
  
  // Get session history (rounds with requests, responses, and turns)
  app.get('/:sessionId/history', async (c) => {
    const sessionId = c.req.param('sessionId');
    try {
      const sessionManager = getSessionManager(isSystem, managers, accessors, workspaceId, workspaceManager);
      const history = await sessionManager.renderSessionHistory(sessionId);
      
      // Convert to SessionHistoryResponse
      const response: SessionHistoryResponse = {
        session: {
          ...history.session,
          metadata: typeof history.session.metadata === 'string'
            ? JSON.parse(history.session.metadata)
            : history.session.metadata || {}
        },
        rounds: history.rounds
      };
      
      return c.json(response);
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        return c.json({ error: 'Session not found' }, 404);
      }
      return sendError(c, error, `Failed to get session history for ${sessionId}`);
    }
  });
  
  // List rounds for a session
  app.get('/:sessionId/rounds', async (c) => {
    const sessionId = c.req.param('sessionId');
    try {
      const sessionManager = getSessionManager(isSystem, managers, accessors, workspaceId, workspaceManager);
      const rounds = await sessionManager.listRounds(sessionId);
      return c.json(rounds);
    } catch (error) {
      return sendError(c, error, `Failed to list rounds for session ${sessionId}`);
    }
  });
  
  // Get a specific round
  app.get('/:sessionId/rounds/:roundId', async (c) => {
    const roundId = c.req.param('roundId');
    try {
      const sessionManager = getSessionManager(isSystem, managers, accessors, workspaceId, workspaceManager);
      const round = await sessionManager.getRound(roundId);
      return c.json(round);
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        return c.json({ error: 'Round not found' }, 404);
      }
      return sendError(c, error, `Failed to get round ${roundId}`);
    }
  });
  
  // Create a new round
  app.post('/:sessionId/rounds', async (c) => {
    const sessionId = c.req.param('sessionId');
    try {
      const sessionManager = getSessionManager(isSystem, managers, accessors, workspaceId, workspaceManager);
      
      const { content } = await c.req.json();
      if (!content) {
        return c.json({ error: 'Content is required' }, 400);
      }
      
      const round = await sessionManager.createRound({
        sessionId,
        content
      });
      
      return c.json(round, 201);
    } catch (error) {
      return sendError(c, error, `Failed to create round for session ${sessionId}`);
    }
  });
  
  // List turns for a response
  app.get('/responses/:responseId/turns', async (c) => {
    const responseId = c.req.param('responseId');
    try {
      const sessionManager = getSessionManager(isSystem, managers, accessors, workspaceId, workspaceManager);
      const turns = await sessionManager.listTurns(responseId);
      return c.json(turns);
    } catch (error) {
      return sendError(c, error, `Failed to list turns for response ${responseId}`);
    }
  });
  
  // Get a specific turn
  app.get('/turns/:turnId', async (c) => {
    const turnId = c.req.param('turnId');
    try {
      const sessionManager = getSessionManager(isSystem, managers, accessors, workspaceId, workspaceManager);
      const turn = await sessionManager.getTurn(turnId);
      return c.json(turn);
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        return c.json({ error: 'Turn not found' }, 404);
      }
      return sendError(c, error, `Failed to get turn ${turnId}`);
    }
  });
  
  // Get a specific turn with parsed tool calls
  app.get('/turns/:turnId/parsed', async (c) => {
    const turnId = c.req.param('turnId');
    try {
      const sessionManager = getSessionManager(isSystem, managers, accessors, workspaceId, workspaceManager);
      const turn = await sessionManager.getTurnWithParsedToolCalls(turnId);
      return c.json(turn);
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        return c.json({ error: 'Turn not found' }, 404);
      }
      return sendError(c, error, `Failed to get turn ${turnId}`);
    }
  });
  
  return app;
}

/**
 * Create routes for system session database access
 */
export function systemSessionDatabaseRoutes(managers: Managers, accessors: ManagerAccessors) {
  return sessionDatabaseRoutes(managers, accessors, true);
}

/**
 * Create routes for workspace session database access
 */
export function workspaceSessionDatabaseRoutes(
  managers: Managers, 
  accessors: ManagerAccessors, 
  workspaceId: string,
  workspaceManager?: WorkspaceManager
) {
  return sessionDatabaseRoutes(managers, accessors, false, workspaceId, workspaceManager);
}