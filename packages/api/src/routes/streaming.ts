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
      
      // Get stream, response ID, and completion promise from the coordinator
      const { responseId, stream, completionPromise } = await coordinator.streamRequest(sessionId, content);
      
      // Convert the AsyncIterable to a ReadableStream for SSE
      const responseStream = new ReadableStream({
        async start(controller) {
          try {
            // Send initial event
            controller.enqueue(`data: ${JSON.stringify({
              type: 'initialized',
              sessionId,
              responseId
            })}\n\n`);
            
            // Stream each turn update as an SSE event
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
              
              // Send turn update
              controller.enqueue(`data: ${JSON.stringify({
                type: 'turn',
                turnId: turn.id,
                index: turn.index,
                content: turn.content,
                status: turn.status,
                toolCalls: parsedToolCalls
              })}\n\n`);
              
              // Send turn-completed event if applicable
              if (turn.status === 'completed' || turn.status === 'error') {
                controller.enqueue(`data: ${JSON.stringify({
                  type: 'turn-completed',
                  turnId: turn.id,
                  status: turn.status
                })}\n\n`);
              }
            }
            
            // Send completed event when stream ends
            controller.enqueue(`data: ${JSON.stringify({
              type: 'completed',
              sessionId,
              responseId
            })}\n\n`);
            
            controller.close();
          } catch (error) {
            // Handle errors during streaming
            console.error('Error processing stream:', error);
            controller.enqueue(`data: ${JSON.stringify({
              type: 'error',
              message: error instanceof Error ? error.message : String(error)
            })}\n\n`);
            controller.close();
          }
        }
      });

      await completionPromise;
      
      // Return the SSE response
      return c.body(responseStream, {
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