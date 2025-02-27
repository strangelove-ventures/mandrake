import { NextRequest } from 'next/server';
import { SessionCoordinator } from '@mandrake/session';
import { ApiError, ErrorCode } from '../middleware/errorHandling';
import { validateBody } from '../middleware/validation';
import { z } from 'zod';
import { getSessionCoordinatorForRequest } from '../../services/helpers';
import { Session } from 'inspector/promises';

// Schema for sending a new message
const sendMessageSchema = z.object({
  content: z.string().min(1, "Message content is required"),
});

/**
 * Handles conversation operations using the SessionCoordinator
 */
export class SessionCoordinatorHandler {
  /**
   * Creates a new SessionCoordinatorHandler
   * @param sessionCoordinator The session coordinator to manage the conversation
   * @param workspaceId Workspace ID for the session (required)
   */
  constructor(
    private coordinator: SessionCoordinator,
    private workspaceId: string
  ) {
    if (!workspaceId) {
      throw new Error("WorkspaceId is required for SessionCoordinatorHandler");
    }
  }

  /**
   * Validates that the session exists
   * @param sessionId Session ID
   * @private
   */
  private async validateSessionExists(sessionId: string): Promise<void> {
    try {
      await this.coordinator..getSession(sessionId);
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        throw new ApiError(
          `Session not found: ${sessionId}`,
          ErrorCode.RESOURCE_NOT_FOUND,
          404,
          err
        );
      }
      throw err;
    }
  }

  /**
   * Sends a new message to a session
   * @param sessionId Session ID
   * @param req HTTP request with message content
   * @returns Response including session history
   */
  async sendMessage(sessionId: string, req: NextRequest): Promise<any> {
    try {
      const data = await validateBody(req, sendMessageSchema);
      
      // Ensure session exists
      await this.validateSessionExists(sessionId);
      
      // Get the session coordinator
      const coordinator = await getSessionCoordinatorForRequest(
        this.workspaceId,
        sessionId
      );
      
      // Process the message (non-streaming)
      await coordinator.handleRequest(sessionId, data.content);
      
      // Return the updated session history
      return this.sessionManager.renderSessionHistory(sessionId);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to send message: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Sends a message to a session and streams the response
   * @param sessionId Session ID
   * @param req HTTP request with message content
   * @returns ReadableStream for response streaming
   */
  async streamMessage(sessionId: string, req: NextRequest): Promise<ReadableStream> {
    try {
      const data = await validateBody(req, sendMessageSchema);
      
      // Ensure session exists
      await this.validateSessionExists(sessionId);
      
      // Store values for use in ReadableStream
      const workspaceId = this.workspaceId;
      const sessionManager = this.sessionManager;
      
      // Create a readable stream for the response
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Get the session coordinator
            const coordinator = await getSessionCoordinatorForRequest(
              workspaceId,
              sessionId
            );
            
            // Process the message
            await coordinator.handleRequest(sessionId, data.content);
            
            // Get the final result
            const history = await sessionManager.renderSessionHistory(sessionId);
            
            // Get the last message and stream it
            const lastRound = history.rounds[history.rounds.length - 1];
            const responseContent = lastRound.response.turns.map(turn => turn.content).join('');
            
            // Send the content as a stream
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'content',
              content: responseContent
            })));
            
            // Send done message
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'done'
            })));
            
            controller.close();
          } catch (error) {
            // Send error message
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'error',
              error: error instanceof Error ? error.message : 'Unknown error'
            })));
            controller.close();
          }
        }
      });
      
      return stream;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to stream message: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }
}
