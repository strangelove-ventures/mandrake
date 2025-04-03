import { Hono } from 'hono';
import { createBunWebSocket } from 'hono/bun';
import { SessionCoordinator } from '@mandrake/session';
import { WorkspaceManager } from '@mandrake/workspace';
import type { ManagerAccessors, Managers } from '../types';
import { sendError } from './utils';
import type {
  StreamRequestRequest,
  StreamRequestResponse,
  StreamInitEvent,
  TurnEvent,
  TurnCompletedEvent,
  CompletedEvent,
  ErrorEvent,
  StreamEventUnion
} from '@mandrake/utils/src/types/api';

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
        modelsManager: managers.mandrakeManager.models
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
 * Import the WSContext type from Hono
 */
import type { WSContext } from 'hono/ws';

/**
 * Active WebSocket connections by session ID
 */
interface WebSocketConnections {
  [sessionId: string]: Set<WSContext<unknown>>;
}

// Maintain a registry of active WebSocket connections
const wsConnectionsBySession: WebSocketConnections = {};

/**
 * Broadcast a message to all WebSocket clients for a session
 */
function broadcastToSession(sessionId: string, event: StreamEventUnion) {
  if (!wsConnectionsBySession[sessionId]) return;
  
  const message = JSON.stringify(event);
  
  for (const wsContext of wsConnectionsBySession[sessionId]) {
    try {
      // Check if the WebSocket is open (readyState === 1) 
      if (wsContext && wsContext.readyState === 1) {
        wsContext.send(message);
      }
    } catch (error) {
      console.error(`Failed to send message to WebSocket: ${error}`);
    }
  }
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
  
  // Get session prompt for a session
  app.get('/:sessionId/prompt', async (c) => {
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
      
      // Build the context which includes the system prompt
      const context = await coordinator.buildContext(sessionId);
      
      // Return the system prompt
      return c.json({
        sessionId,
        systemPrompt: context.systemPrompt
      });
    } catch (error) {
      return sendError(c, error, `Failed to get prompt for session ${sessionId}`);
    }
  });
  
  // WebSocket endpoint for session streaming using Hono/Bun adapter
  const { upgradeWebSocket, websocket } = createBunWebSocket();

  app.get('/:sessionId/ws', upgradeWebSocket(async (c) => {
    const sessionId = c.req.param('sessionId');
    console.log(`WebSocket connection request for session ${sessionId}`);
    
    return {
      // WebSocket opened handler
      onOpen: (event, ws) => {
        console.log(`WebSocket opened for session ${sessionId}`);
        
        // Initialize connection registry for this session if needed
        if (!wsConnectionsBySession[sessionId]) {
          wsConnectionsBySession[sessionId] = new Set();
        }
        
        // Add this connection to the registry
        wsConnectionsBySession[sessionId].add(ws);
        
        // Send ready event
        ws.send(JSON.stringify({
          type: 'ready',
          sessionId
        }));
      },
      
      // WebSocket message handler
      onMessage: async (event, ws) => {
        const messageData = event.data.toString();
        console.log(`WebSocket message received for session ${sessionId}:`, messageData);
        
        try {
          // Parse the request data
          const data = JSON.parse(messageData) as StreamRequestRequest;
          const { content } = data;
          
          if (!content) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Request content is required'
            }));
            return;
          }
          
          // Get or create a session coordinator
          const coordinator = getOrCreateSessionCoordinator(
            isSystem, 
            sessionId, 
            managers, 
            accessors, 
            workspaceId
          );
          
          // Get stream, response ID, and completion promise from the coordinator
          const { responseId, stream, completionPromise } = await coordinator.streamRequest(sessionId, content);
          
          // Send initial event to all clients connected to this session
          const initEvent: StreamInitEvent = {
            type: 'initialized',
            sessionId,
            responseId
          };
          broadcastToSession(sessionId, initEvent);
          
          // Stream each turn update as a WebSocket message
          try {
            for await (const turn of stream) {
              // Parse tool calls if present
              let parsedToolCalls = [];
              try {
                if (turn.toolCalls) {
                  parsedToolCalls = JSON.parse(turn.toolCalls);
                }
              } catch (e) {
                console.error('Error parsing tool calls:', e);
              }
              
              // Send turn update to all clients
              const turnEvent: TurnEvent = {
                type: 'turn',
                turnId: turn.id,
                index: turn.index,
                content: turn.content,
                status: turn.status,
                toolCalls: parsedToolCalls
              };
              broadcastToSession(sessionId, turnEvent);
              
              // Send turn-completed event if applicable
              if (turn.status === 'completed' || turn.status === 'error') {
                const completedEvent: TurnCompletedEvent = {
                  type: 'turn-completed',
                  turnId: turn.id,
                  status: turn.status
                };
                broadcastToSession(sessionId, completedEvent);
              }
            }
            
            // Send completed event when stream ends
            const finalEvent: CompletedEvent = {
              type: 'completed',
              sessionId,
              responseId
            };
            broadcastToSession(sessionId, finalEvent);
            
          } catch (error) {
            // Handle errors during streaming
            console.error('Error processing stream:', error);
            const errorEvent: ErrorEvent = {
              type: 'error',
              message: error instanceof Error ? error.message : String(error)
            };
            broadcastToSession(sessionId, errorEvent);
          }
          
          await completionPromise;
          
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : String(error)
          }));
        }
      },
      
      // WebSocket close handler
      onClose: (event, ws) => {
        console.log(`WebSocket closed for session ${sessionId}`);
        
        // Remove this connection from the registry
        if (wsConnectionsBySession[sessionId]) {
          wsConnectionsBySession[sessionId].delete(ws);
          
          // Clean up the registry if no connections remain
          if (wsConnectionsBySession[sessionId].size === 0) {
            delete wsConnectionsBySession[sessionId];
          }
        }
      }
    };
  }));
  
  // Legacy endpoint redirect to WebSocket
  app.post('/:sessionId/request', async (c) => {
    const sessionId = c.req.param('sessionId');
    return c.json({ 
      error: 'This endpoint has been deprecated. Please use the WebSocket endpoint at /:sessionId/ws',
      websocketEndpoint: `${c.req.url.replace('/request', '/ws')}`
    }, 410); // 410 Gone status code
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