import { NextRequest } from 'next/server';
import { SessionsHandler } from '../handlers/SessionsHandler';
import { handleApiError } from '../middleware/errorHandling';
import { createApiResponse, createApiStreamResponse, createNoContentResponse } from '../utils/response';
import { getMandrakeManagerForRequest, getWorkspaceManagerForRequest } from '../../services/helpers';
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
        let workspaceId: string | undefined;
        let sessionManager;
        
        // Setup handler based on scope
        if (isWorkspaceScope && params?.id) {
          workspaceId = params.id as string;
          const workspaceManager = await getWorkspaceManagerForRequest(workspaceId, process.env.MANDRAKE_ROOT || '');
          sessionManager = workspaceManager.sessions;
        } else {
          workspaceId = undefined;
          // Use the MandrakeManager's session manager for system-level operations
          const mandrakeManager = await getMandrakeManagerForRequest();
          sessionManager = mandrakeManager.sessions;
        }
        
        const handler = new SessionsHandler(workspaceId, sessionManager);
        
        // Handle specific session request
        if (params?.sessionId) {
          const { id } = validateParams(
            { id: params.sessionId }, 
            sessionIdSchema
          );
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
    
    // POST handler for creating a new session
    async POST(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        let workspaceId: string | undefined;
        let sessionManager;
        
        // Setup handler based on scope
        if (isWorkspaceScope && params?.id) {
          workspaceId = params.id as string;
          const workspaceManager = await getWorkspaceManagerForRequest(workspaceId, process.env.MANDRAKE_ROOT || '');
          sessionManager = workspaceManager.sessions;
        } else {
          workspaceId = undefined;
          // Use the MandrakeManager's session manager for system-level operations
          const mandrakeManager = await getMandrakeManagerForRequest();
          sessionManager = mandrakeManager.sessions;
        }
        
        const handler = new SessionsHandler(workspaceId, sessionManager);
        
        // Handle sending a message to an existing session
        if (params?.sessionId && params?.messages) {
          const { id } = validateParams(
            { id: params.sessionId }, 
            sessionIdSchema
          );
          
          const result = await handler.sendMessage(id, req);
          return createApiResponse(result);
        }
        
        // Handle streaming a message to an existing session
        if (params?.sessionId && params?.stream) {
          const { id } = validateParams(
            { id: params.sessionId }, 
            sessionIdSchema
          );
          
          const stream = await handler.streamMessage(id, req);
          return createApiStreamResponse(stream);
        }
        
        // Create a new session
        const session = await handler.createSession(req);
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
        let workspaceId: string | undefined;
        let sessionManager;
        
        // Setup handler based on scope
        if (isWorkspaceScope && params?.id) {
          workspaceId = params.id as string;
          const workspaceManager = await getWorkspaceManagerForRequest(workspaceId, process.env.MANDRAKE_ROOT || '');
          sessionManager = workspaceManager.sessions;
        } else {
          workspaceId = undefined;
          // Use the MandrakeManager's session manager for system-level operations
          const mandrakeManager = await getMandrakeManagerForRequest();
          sessionManager = mandrakeManager.sessions;
        }
        
        const handler = new SessionsHandler(workspaceId, sessionManager);
        
        // Update a session
        if (params?.sessionId) {
          const { id } = validateParams(
            { id: params.sessionId }, 
            sessionIdSchema
          );
          
          const session = await handler.updateSession(id, req);
          return createApiResponse(session);
        }
        
        return handleApiError(new Error('Missing sessionId parameter'));
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
        let workspaceId: string | undefined;
        let sessionManager;
        
        // Setup handler based on scope
        if (isWorkspaceScope && params?.id) {
          workspaceId = params.id as string;
          const workspaceManager = await getWorkspaceManagerForRequest(workspaceId, process.env.MANDRAKE_ROOT || '');
          sessionManager = workspaceManager.sessions;
        } else {
          workspaceId = undefined;
          // Use the MandrakeManager's session manager for system-level operations
          const mandrakeManager = await getMandrakeManagerForRequest();
          sessionManager = mandrakeManager.sessions;
        }
        
        const handler = new SessionsHandler(workspaceId, sessionManager);
        
        // Delete a session
        if (params?.sessionId) {
          const { id } = validateParams(
            { id: params.sessionId }, 
            sessionIdSchema
          );
          
          await handler.deleteSession(id);
          return createNoContentResponse();
        }
        
        return handleApiError(new Error('Missing sessionId parameter'));
      } catch (error) {
        return handleApiError(error);
      }
    }
  };
}
