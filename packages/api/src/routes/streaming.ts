import { Hono } from 'hono';
import { SessionCoordinator } from '@mandrake/session';
import { WorkspaceManager } from '@mandrake/workspace';
import type { ManagerAccessors, Managers } from '../types';
import { sendError } from './utils';

/**
 * Helper function to get or create the correct session coordinator
 */
function getOrCreateSessionCoordinator(
  isSystem: boolean,
  sessionId: string,
  managers: Managers,
  accessors: ManagerAccessors,
  workspaceId?: string
): SessionCoordinator {
  let coordinator: SessionCoordinator | undefined;

  if (isSystem) {
    // For system sessions
    coordinator = managers.systemSessionCoordinators.get(sessionId);
    if (!coordinator) {
      coordinator = new SessionCoordinator({
        metadata: {
          name: 'system',
          path: managers.mandrakeManager.paths.root
        },
        promptManager: managers.mandrakeManager.prompt,
        sessionManager: managers.mandrakeManager.sessions,
        mcpManager: managers.systemMcpManager,
        modelsManager: managers.mandrakeManager.models,
        filesManager: managers.mandrakeManager.files,
        dynamicContextManager: managers.mandrakeManager.dynamic
      });
      managers.systemSessionCoordinators.set(sessionId, coordinator);
    }
  } else {
    // For workspace sessions
    const wsId = workspaceId!; // Must be provided
    
    const coordMap = accessors.getSessionCoordinatorMap(wsId);
    if (coordMap) {
      coordinator = coordMap.get(sessionId);
    }
    
    if (!coordinator) {
      const workspace = accessors.getWorkspaceManager(wsId);
      if (!workspace) {
        throw new Error(`Workspace ${wsId} not found`);
      }
      
      const mcpManager = accessors.getMcpManager(wsId);
      if (!mcpManager) {
        throw new Error(`MCP Manager for workspace ${wsId} not found`);
      }
      
      coordinator = new SessionCoordinator({
        metadata: {
          name: workspace.name,
          path: workspace.paths.root
        },
        promptManager: workspace.prompt,
        sessionManager: workspace.sessions,
        mcpManager,
        modelsManager: workspace.models,
        filesManager: workspace.files,
        dynamicContextManager: workspace.dynamic
      });
      
      accessors.createSessionCoordinator(wsId, sessionId, coordinator);
    }
  }
  
  return coordinator;
}

/**
 * Create routes for session streaming
 */
export function sessionStreamingRoutes(
  managers: Managers,
  accessors: ManagerAccessors,
  isSystem: boolean = false,
  workspaceId?: string
) {
  const app = new Hono();
  
  // Stream a new request and response
  app.post('/:sessionId/request', async (c) => {
    const sessionId = c.req.param('sessionId');
    
    try {
      // Get or create a session coordinator
      const coordinator = getOrCreateSessionCoordinator(
        isSystem, 
        sessionId, 
        managers, 
        accessors, 
        workspaceId
      );
      
      // Get the request content
      const { content } = await c.req.json();
      if (!content) {
        return c.json({ error: 'Request content is required' }, 400);
      }
      
      // Create the streaming response
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Initialize the round (creates request and response records in DB)
            const { responseId } = await coordinator.initializeRound(sessionId, content);
            
            // Get the session manager
            const sessionManager = isSystem 
              ? managers.mandrakeManager.sessions 
              : accessors.getWorkspaceManager(workspaceId!)!.sessions;
            
            // Send initial event to inform client that the request has been accepted
            controller.enqueue(`data: ${JSON.stringify({
              type: 'initialized',
              sessionId,
              responseId
            })}\n\n`);
            
            // Create an initial turn for the streaming response
            try {
              await sessionManager.createTurn({
                responseId,
                index: 0,
                content: '',
                rawResponse: '',
                toolCalls: '[]',
                status: 'streaming',
                inputTokens: 0,
                outputTokens: 0,
                inputCost: 0,
                outputCost: 0
              });
              
              // Process the request (this is where all the magic happens)
              // handleRequest creates turns in the DB as it processes the request
              coordinator.handleRequest(sessionId, content)
                .then(() => {
                  // When complete, send a final event to inform client
                  controller.enqueue(`data: ${JSON.stringify({
                    type: 'completed',
                    sessionId,
                    responseId
                  })}\n\n`);
                  controller.close();
                })
                .catch(error => {
                  // Handle error
                  console.error('Error handling request:', error);
                  controller.enqueue(`data: ${JSON.stringify({
                    type: 'error',
                    message: error instanceof Error ? error.message : String(error)
                  })}\n\n`);
                  controller.close();
                });
            } catch (error) {
              console.error('Error creating initial turn:', error);
              controller.enqueue(`data: ${JSON.stringify({
                type: 'error',
                message: error instanceof Error ? error.message : String(error)
              })}\n\n`);
              controller.close();
            }
            
            // Set up turn tracking - this streams updates as they happen
            
            const cleanup = sessionManager.trackStreamingTurns(responseId, (turn) => {
              try {
                // For each turn update, send the current state to the client
                const turnData = {
                  type: 'turn',
                  turnId: turn.id,
                  index: turn.index,
                  content: turn.content,
                  status: turn.status,
                  toolCalls: turn.toolCalls ? JSON.parse(turn.toolCalls) : []
                };
                
                controller.enqueue(`data: ${JSON.stringify(turnData)}\n\n`);
                
                // If this specific turn is complete, send a turn-completed event
                if (turn.status === 'completed' || turn.status === 'error') {
                  controller.enqueue(`data: ${JSON.stringify({
                    type: 'turn-completed',
                    turnId: turn.id,
                    status: turn.status
                  })}\n\n`);
                }
              } catch (error) {
                console.error('Error sending turn update:', error);
              }
            });
            
            // Set up cleanup when stream closes
            c.res.onAbort(() => {
              cleanup();
            });
          } catch (error) {
            console.error('Error starting stream:', error);
            controller.enqueue(`data: ${JSON.stringify({
              type: 'error',
              message: error.message
            })}\n\n`);
            controller.close();
          }
        }
      });
      
      // Return the stream response
      return c.body(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    } catch (error) {
      return sendError(c, error, `Failed to stream session ${sessionId}`);
    }
  });
  
  // Stream an existing response (for when client reconnects)
  app.get('/responses/:responseId/stream', async (c) => {
    const responseId = c.req.param('responseId');
    
    try {
      // Determine the appropriate session manager
      const sessionManager = isSystem 
        ? managers.mandrakeManager.sessions 
        : accessors.getWorkspaceManager(workspaceId!)!.sessions;
      
      // Get the response to check it exists and get session info
      const response = await sessionManager.getResponse(responseId);
      if (!response) {
        return c.json({ error: 'Response not found' }, 404);
      }
      
      // Create the streaming response
      const stream = new ReadableStream({
        start(controller) {
          try {
            // Send initial event with response info
            controller.enqueue(`data: ${JSON.stringify({
              type: 'initialized',
              responseId,
              sessionId: response.sessionId
            })}\n\n`);
            
            // Set up turn tracking
            const cleanup = sessionManager.trackStreamingTurns(responseId, (turn) => {
              try {
                // For each turn update, send the current state to the client
                const turnData = {
                  type: 'turn',
                  turnId: turn.id,
                  index: turn.index,
                  content: turn.content,
                  status: turn.status,
                  toolCalls: turn.toolCalls ? JSON.parse(turn.toolCalls) : []
                };
                
                controller.enqueue(`data: ${JSON.stringify(turnData)}\n\n`);
                
                // If this specific turn is complete, send a turn-completed event
                if (turn.status === 'completed' || turn.status === 'error') {
                  controller.enqueue(`data: ${JSON.stringify({
                    type: 'turn-completed',
                    turnId: turn.id,
                    status: turn.status
                  })}\n\n`);
                  
                  // Check if all turns are complete
                  sessionManager.getStreamingStatus(responseId).then(status => {
                    if (status.isComplete) {
                      controller.enqueue(`data: ${JSON.stringify({
                        type: 'completed',
                        responseId
                      })}\n\n`);
                      controller.close();
                      cleanup();
                    }
                  });
                }
              } catch (error) {
                console.error('Error sending turn update:', error);
              }
            });
            
            // Set up cleanup when stream closes
            c.res.onAbort(() => {
              cleanup();
            });
          } catch (error) {
            console.error('Error starting stream:', error);
            controller.enqueue(`data: ${JSON.stringify({
              type: 'error',
              message: error instanceof Error ? error.message : String(error)
            })}\n\n`);
            controller.close();
          }
        }
      });
      
      // Return the stream response
      return c.body(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    } catch (error) {
      return sendError(c, error, `Failed to stream response ${responseId}`);
    }
  });
  
  return app;
}

/**
 * Create routes for system session streaming
 */
export function systemSessionStreamingRoutes(managers: Managers, accessors: ManagerAccessors) {
  return sessionStreamingRoutes(managers, accessors, true);
}

/**
 * Create routes for workspace session streaming
 */
export function workspaceSessionStreamingRoutes(
  managers: Managers, 
  accessors: ManagerAccessors, 
  workspaceId: string
) {
  return sessionStreamingRoutes(managers, accessors, false, workspaceId);
}