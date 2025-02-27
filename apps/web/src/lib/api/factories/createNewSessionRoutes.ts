import { NextRequest } from 'next/server';
import { SessionManagerHandler } from '../handlers/SessionManagerHandler';
import { SessionCoordinatorHandler } from '../handlers/SessionCoordinatorHandler';
import { handleApiError } from '../middleware/errorHandling';
import { createApiResponse, createApiStreamResponse, createNoContentResponse } from '../utils/response';
import { 
  getManagerForWorkspace,
  getManagerFromMandrake,
  SessionManager
} from '../../services/helpers';
import { validateParams } from '../middleware/validation';
import { z } from 'zod';

// Parameter schemas
const sessionIdSchema = z.object({
  id: z.string().uuid("Invalid session ID format")
});

/**
 * Creates route handlers for session endpoints
 * @param isWorkspaceScope Whether these routes are for workspace-specific sessions
 * @returns Route handler methods
 */
export function createSessionRoutes(isWorkspaceScope: boolean = false) {
  return {
    // GET handler for listing sessions or getting a specific session
    async GET(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        // Setup appropriate session manager based on scope
        let workspaceId: string | undefined;
        let sessionManager: SessionManager;
        
        if (isWorkspaceScope && params?.id) {
          workspaceId = params.id as string;
          sessionManager = await getManagerForWorkspace<SessionManager>(workspaceId, 'sessions');
        } else {
          // Use the MandrakeManager's session manager for system-level operations
          sessionManager = await getManagerFromMandrake<SessionManager>('sessions');
        }
        
        const handler = new SessionManagerHandler(sessionManager, workspaceId);
        
        // Handle specific session request
        if (params?.sessionId) {
          const { id } = validateParams(
            { id: params.sessionId }, 
            sessionIdSchema
          );
          
          // Check if we're requesting messages
          if (req.url.includes('/messages')) {
            const messages = await handler.getMessages(id);
            return createApiResponse(messages);
          }
          
          // Otherwise just get session details
          const session = await handler.getSession(id);
          return createApiResponse(session);
        }
        
        // List all sessions
        const sessions = await handler.listSessions();
        return createApiResponse(sessions);
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    // POST handler for creating a new session or sending messages
    async POST(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        // Setup handler based on scope
        let workspaceId: string | undefined;
        let sessionManager: SessionManager;
        
        if (isWorkspaceScope && params?.id) {
          workspaceId = params.id as string;
          sessionManager = await getManagerForWorkspace<SessionManager>(workspaceId, 'sessions');
        } else {
          // Use the MandrakeManager's session manager for system-level operations
          sessionManager = await getManagerFromMandrake<SessionManager>('sessions');
        }
        
        // Handle sending a message to an existing session (requires SessionCoordinatorHandler)
        if (params?.sessionId && (params?.messages || params?.stream)) {
          // SessionCoordinator requires a workspace ID
          if (!workspaceId) {
            return handleApiError(new Error('Workspace ID is required for sending messages'));
          }
          
          const { id } = validateParams(
            { id: params.sessionId }, 
            sessionIdSchema
          );
          
          const coordinatorHandler = new SessionCoordinatorHandler(sessionManager, workspaceId);
          
          // Handle streaming vs. non-streaming
          if (params?.stream) {
            const stream = await coordinatorHandler.streamMessage(id, req);
            return createApiStreamResponse(stream);
          } else {
            const result = await coordinatorHandler.sendMessage(id, req);
            return createApiResponse(result);
          }
        }
        
        // Create a new session (uses SessionManagerHandler)
        const managerHandler = new SessionManagerHandler(sessionManager, workspaceId);
        const session = await managerHandler.createSession(req);
        return createApiResponse(session, 201);
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    // PUT handler for updating a session
    async PUT(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        if (!params?.sessionId) {
          return handleApiError(new Error('Missing sessionId parameter'));
        }
        
        // Setup handler based on scope
        let workspaceId: string | undefined;
        let sessionManager: SessionManager;
        
        if (isWorkspaceScope && params?.id) {
          workspaceId = params.id as string;
          sessionManager = await getManagerForWorkspace<SessionManager>(workspaceId, 'sessions');
        } else {
          // Use the MandrakeManager's session manager for system-level operations
          sessionManager = await getManagerFromMandrake<SessionManager>('sessions');
        }
        
        const handler = new SessionManagerHandler(sessionManager, workspaceId);
        
        // Update a session
        const { id } = validateParams(
          { id: params.sessionId }, 
          sessionIdSchema
        );
        
        const session = await handler.updateSession(id, req);
        return createApiResponse(session);
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    // DELETE handler for removing a session
    async DELETE(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        if (!params?.sessionId) {
          return handleApiError(new Error('Missing sessionId parameter'));
        }
        
        // Setup handler based on scope
        let workspaceId: string | undefined;
        let sessionManager: SessionManager;
        
        if (isWorkspaceScope && params?.id) {
          workspaceId = params.id as string;
          sessionManager = await getManagerForWorkspace<SessionManager>(workspaceId, 'sessions');
        } else {
          // Use the MandrakeManager's session manager for system-level operations
          sessionManager = await getManagerFromMandrake<SessionManager>('sessions');
        }
        
        const handler = new SessionManagerHandler(sessionManager, workspaceId);
        
        // Delete a session
        const { id } = validateParams(
          { id: params.sessionId }, 
          sessionIdSchema
        );
        
        await handler.deleteSession(id);
        return createNoContentResponse();
      } catch (error) {
        return handleApiError(error);
      }
    }
  };
}
