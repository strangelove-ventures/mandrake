import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, ErrorCode } from '../middleware/errorHandling';
import { validateBody } from '../middleware/validation';
import { createApiResponse, createApiStreamResponse, createNoContentResponse } from '../utils/response';
import { createSystemSessionCoordinator, createWorkspaceSessionCoordinator, getMandrakeManager, getWorkspaceManagerById } from '../utils/workspace';

// Validation schemas
const sessionCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional()
});

const sessionUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional()
});

const messageSchema = z.object({
  content: z.string().min(1)
});

/**
 * Creates handlers for session routes (both system and workspace-level)
 * @param workspaceScoped Whether these routes are scoped to a workspace
 */
export function createSessionRoutes(workspaceScoped = false) {
  return {
    /**
     * GET - List sessions or get a specific session
     */
    async GET(
      req: NextRequest,
      { params }: { params?: { id?: string, sessionId?: string } } = {}
    ) {
      try {
        let sessionManager;
        
        if (workspaceScoped) {
          if (!params?.id) {
            throw new ApiError(
              'Workspace ID is required',
              ErrorCode.BAD_REQUEST,
              400
            );
          }
          const workspace = await getWorkspaceManagerById(params.id);
          sessionManager = workspace.sessions;
        } else {
          const mandrakeManager = getMandrakeManager();
          sessionManager = mandrakeManager.sessions;
        }
        
        if (params?.sessionId) {
          // Get specific session details
          const session = await sessionManager.getSession(params.sessionId);
          if (!session) {
            throw new ApiError(
              `Session not found: ${params.sessionId}`,
              ErrorCode.RESOURCE_NOT_FOUND,
              404
            );
          }
          return createApiResponse(session);
        } else {
          // List all sessions
          const sessions = await sessionManager.listSessions();
          return createApiResponse(sessions);
        }
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw new ApiError(
            `Failed to get sessions: ${error instanceof Error ? error.message : String(error)}`,
            ErrorCode.INTERNAL_ERROR,
            500,
            error instanceof Error ? error : undefined
          );
        }
        throw error;
      }
    },
    
    /**
     * POST - Create a new session or send a message
     */
    async POST(
      req: NextRequest,
      { params }: { params?: { id?: string, sessionId?: string } } = {}
    ) {
      try {
        let sessionManager, coordinator;
        
        if (workspaceScoped) {
          if (!params?.id) {
            throw new ApiError(
              'Workspace ID is required',
              ErrorCode.BAD_REQUEST,
              400
            );
          }
          const workspace = await getWorkspaceManagerById(params.id);
          sessionManager = workspace.sessions;
          coordinator = createWorkspaceSessionCoordinator(workspace);
        } else {
          const mandrakeManager = getMandrakeManager();
          sessionManager = mandrakeManager.sessions;
          coordinator = createSystemSessionCoordinator();
        }
        
        if (params?.sessionId) {
          // Send a message in existing session
          const body = await validateBody(req, messageSchema);
          
          // Check if session exists
          const session = await sessionManager.getSession(params.sessionId);
          if (!session) {
            throw new ApiError(
              `Session not found: ${params.sessionId}`,
              ErrorCode.RESOURCE_NOT_FOUND,
              404
            );
          }
          
          // Check if client requests streaming response
          if (req.headers.get('accept') === 'text/event-stream') {
            // Create a streaming response
            const stream = new ReadableStream({
              async start(controller) {
                try {
                  // Create a function to handle stream events
                  const handleStreamEvent = (event: any) => {
                    // Format the event data as SSE
                    const data = JSON.stringify(event);
                    controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
                    
                    // Close the stream when complete
                    if (event.type === 'done') {
                      controller.close();
                    }
                  };
                  
                  // Start processing the request with streaming
                  await coordinator.handleRequest(params.sessionId!, body.content);
                  
                  // Send completion event
                  handleStreamEvent({ type: 'done' });
                } catch (error) {
                  // Handle errors in the stream
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({
                        type: 'error',
                        error: error instanceof Error ? error.message : String(error)
                      })}\n\n`
                    )
                  );
                  controller.close();
                }
              }
            });
            
            return createApiStreamResponse(stream);
          } else {
            // Normal request/response
            await coordinator.handleRequest(params.sessionId, body.content);
            
            // Return the session with updated message count
            const updatedSession = await sessionManager.getSession(params.sessionId);
            return createApiResponse(updatedSession);
          }
        } else {
          // Create a new session
          const body = await validateBody(req, sessionCreateSchema);
          
          const session = await sessionManager.createSession({
            title: body.title,
            description: body.description || '',
            metadata: {}
          });
          
          return createApiResponse(session, 201);
        }
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw new ApiError(
            `Failed to process session request: ${error instanceof Error ? error.message : String(error)}`,
            ErrorCode.INTERNAL_ERROR,
            500,
            error instanceof Error ? error : undefined
          );
        }
        throw error;
      }
    },
    
    /**
     * PUT - Update a session
     */
    async PUT(
      req: NextRequest,
      { params }: { params: { id?: string, sessionId: string } }
    ) {
      try {
        let sessionManager;
        
        if (workspaceScoped) {
          if (!params?.id) {
            throw new ApiError(
              'Workspace ID is required',
              ErrorCode.BAD_REQUEST,
              400
            );
          }
          const workspace = await getWorkspaceManagerById(params.id);
          sessionManager = workspace.sessions;
        } else {
          const mandrakeManager = getMandrakeManager();
          sessionManager = mandrakeManager.sessions;
        }
        
        const body = await validateBody(req, sessionUpdateSchema);
        
        // Check if session exists
        const session = await sessionManager.getSession(params.sessionId);
        if (!session) {
          throw new ApiError(
            `Session not found: ${params.sessionId}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404
          );
        }
        
        // Update session
        const updates: any = {};
        
        if (body.name !== undefined) {
          updates.name = body.name;
        }
        
        if (body.description !== undefined) {
          updates.description = body.description;
        }
        
        const updatedSession = await sessionManager.updateSession(params.sessionId, updates);
        return createApiResponse(updatedSession);
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw new ApiError(
            `Failed to update session: ${error instanceof Error ? error.message : String(error)}`,
            ErrorCode.INTERNAL_ERROR,
            500,
            error instanceof Error ? error : undefined
          );
        }
        throw error;
      }
    },
    
    /**
     * DELETE - Remove a session
     */
    async DELETE(
      req: NextRequest,
      { params }: { params: { id?: string, sessionId: string } }
    ) {
      try {
        let sessionManager;
        
        if (workspaceScoped) {
          if (!params?.id) {
            throw new ApiError(
              'Workspace ID is required',
              ErrorCode.BAD_REQUEST,
              400
            );
          }
          const workspace = await getWorkspaceManagerById(params.id);
          sessionManager = workspace.sessions;
        } else {
          const mandrakeManager = getMandrakeManager();
          sessionManager = mandrakeManager.sessions;
        }
        
        // Check if session exists
        const session = await sessionManager.getSession(params.sessionId);
        if (!session) {
          throw new ApiError(
            `Session not found: ${params.sessionId}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404
          );
        }
        
        // Delete session
        await sessionManager.deleteSession(params.sessionId);
        
        return createNoContentResponse();
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw new ApiError(
            `Failed to delete session: ${error instanceof Error ? error.message : String(error)}`,
            ErrorCode.INTERNAL_ERROR,
            500,
            error instanceof Error ? error : undefined
          );
        }
        throw error;
      }
    }
  };
}

/**
 * Creates handlers for session messages routes
 * @param workspaceScoped Whether these routes are scoped to a workspace
 */
export function createSessionMessagesRoutes(workspaceScoped = false) {
  return {
    /**
     * GET - Get messages for a session
     */
    async GET(
      req: NextRequest,
      { params }: { params: { id?: string, sessionId: string } }
    ) {
      try {
        let sessionManager;
        
        if (workspaceScoped) {
          if (!params?.id) {
            throw new ApiError(
              'Workspace ID is required',
              ErrorCode.BAD_REQUEST,
              400
            );
          }
          const workspace = await getWorkspaceManagerById(params.id);
          sessionManager = workspace.sessions;
        } else {
          const mandrakeManager = getMandrakeManager();
          sessionManager = mandrakeManager.sessions;
        }
        
        // Check if session exists
        const session = await sessionManager.getSession(params.sessionId);
        if (!session) {
          throw new ApiError(
            `Session not found: ${params.sessionId}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404
          );
        }
        
        // Get messages
        const messages = await sessionManager.renderSessionHistory(params.sessionId);
        return createApiResponse(messages);
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw new ApiError(
            `Failed to get session messages: ${error instanceof Error ? error.message : String(error)}`,
            ErrorCode.INTERNAL_ERROR,
            500,
            error instanceof Error ? error : undefined
          );
        }
        throw error;
      }
    },
    
    /**
     * POST - Send a message to the session
     */
    async POST(
      req: NextRequest,
      { params }: { params: { id?: string, sessionId: string } }
    ) {
      try {
        let sessionManager, coordinator;
        
        if (workspaceScoped) {
          if (!params?.id) {
            throw new ApiError(
              'Workspace ID is required',
              ErrorCode.BAD_REQUEST,
              400
            );
          }
          const workspace = await getWorkspaceManagerById(params.id);
          sessionManager = workspace.sessions;
          coordinator = createWorkspaceSessionCoordinator(workspace);
        } else {
          const mandrakeManager = getMandrakeManager();
          sessionManager = mandrakeManager.sessions;
          coordinator = createSystemSessionCoordinator();
        }
        
        const body = await validateBody(req, messageSchema);
        
        // Check if session exists
        const session = await sessionManager.getSession(params.sessionId);
        if (!session) {
          throw new ApiError(
            `Session not found: ${params.sessionId}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404
          );
        }
        
        // Process message
        await coordinator.handleRequest(params.sessionId, body.content);
        
        // Get updated messages
        const messages = await sessionManager.renderSessionHistory(params.sessionId);
        return createApiResponse(messages);
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw new ApiError(
            `Failed to send message: ${error instanceof Error ? error.message : String(error)}`,
            ErrorCode.INTERNAL_ERROR,
            500,
            error instanceof Error ? error : undefined
          );
        }
        throw error;
      }
    }
  };
}

/**
 * Creates handlers for session streaming routes
 * @param workspaceScoped Whether these routes are scoped to a workspace
 */
export function createSessionStreamRoutes(workspaceScoped = false) {
  return {
    /**
     * POST - Send a message and stream the response
     */
    async POST(
      req: NextRequest,
      { params }: { params: { id?: string, sessionId: string } }
    ) {
      try {
        let coordinator;
        
        if (workspaceScoped) {
          if (!params?.id) {
            throw new ApiError(
              'Workspace ID is required',
              ErrorCode.BAD_REQUEST,
              400
            );
          }
          const workspace = await getWorkspaceManagerById(params.id);
          coordinator = createWorkspaceSessionCoordinator(workspace);
        } else {
          coordinator = createSystemSessionCoordinator();
        }
        
        const body = await validateBody(req, messageSchema);
        
        // Create a streaming response
        const stream = new ReadableStream({
          async start(controller) {
            try {
              // Create a function to handle stream events
              const handleStreamEvent = (event: any) => {
                // Format the event data as SSE
                const data = JSON.stringify(event);
                controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
                
                // Close the stream when complete
                if (event.type === 'done') {
                  controller.close();
                }
              };
              
              // Start processing the request with streaming
              await coordinator.handleRequest(params.sessionId, body.content);
              
              // Send completion event
              handleStreamEvent({ type: 'done' });
            } catch (error) {
              // Handle errors in the stream
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({
                    type: 'error',
                    error: error instanceof Error ? error.message : String(error)
                  })}\n\n`
                )
              );
              controller.close();
            }
          }
        });
        
        return createApiStreamResponse(stream);
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw new ApiError(
            `Failed to send message: ${error instanceof Error ? error.message : String(error)}`,
            ErrorCode.INTERNAL_ERROR,
            500,
            error instanceof Error ? error : undefined
          );
        }
        throw error;
      }
    }
  };
}
