import { NextRequest } from 'next/server';
import { SessionManager } from '@mandrake/workspace';
import { ApiError, ErrorCode } from '../middleware/errorHandling';
import { validateBody } from '../middleware/validation';
import { z } from 'zod';
import { 
  getSessionCoordinatorForRequest, 
  getWorkspaceManagerForRequest 
} from '../../services/helpers';
import { dirname } from 'path';

// Schema for creating a new session
const createSessionSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

// Schema for updating a session
const updateSessionSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

// Schema for sending a new message
const sendMessageSchema = z.object({
  content: z.string().min(1, "Message content is required"),
});

/**
 * Handles session operations for both system and workspace levels
 */
export class SessionsHandler {
  constructor(
    private sessionManager: SessionManager,
    private workspaceId?: string
  ) {}

  /**
   * Lists all sessions
   * @returns Array of sessions
   */
  async listSessions(): Promise<any[]> {
    try {
      if (this.workspaceId) {
        return this.sessionManager.listSessions({
          workspaceId: this.workspaceId
        });
      } else {
        // For system-level, list all sessions
        return this.sessionManager.listSessions();
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to list sessions: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Gets a session by ID
   * @param sessionId Session ID
   * @returns Session details
   */
  async getSession(sessionId: string): Promise<any> {
    try {
      try {
        return await this.sessionManager.getSession(sessionId);
      } catch (err) {
        // Convert workspace error to ApiError
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
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to get session: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Creates a new session
   * @param req HTTP request with session data
   * @returns Created session
   */
  async createSession(req: NextRequest): Promise<any> {
    try {
      const data = await validateBody(req, createSessionSchema);
      
      return this.sessionManager.createSession({
        workspaceId: this.workspaceId,
        title: data.title,
        description: data.description,
        metadata: data.metadata
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to create session: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Updates a session
   * @param sessionId Session ID
   * @param req HTTP request with updated session data
   * @returns Updated session
   */
  async updateSession(sessionId: string, req: NextRequest): Promise<any> {
    try {
      const data = await validateBody(req, updateSessionSchema);
      
      try {
        return await this.sessionManager.updateSession(sessionId, {
          title: data.title,
          description: data.description,
          metadata: data.metadata
        });
      } catch (err) {
        // Convert workspace error to ApiError
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
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to update session: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Deletes a session
   * @param sessionId Session ID
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      // First check if session exists to provide proper error handling
      try {
        await this.sessionManager.getSession(sessionId);
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
      
      // If we get here, the session exists so we can delete it
      await this.sessionManager.deleteSession(sessionId);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to delete session: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Gets all messages for a session
   * @param sessionId Session ID
   * @returns Session messages
   */
  async getMessages(sessionId: string): Promise<any> {
    try {
      try {
        return await this.sessionManager.renderSessionHistory(sessionId);
      } catch (err) {
        // Convert workspace error to ApiError
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
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to get messages: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Sends a new message to a session
   * @param sessionId Session ID
   * @param req HTTP request with message content
   * @returns Response
   */
  async sendMessage(sessionId: string, req: NextRequest): Promise<any> {
    try {
      const data = await validateBody(req, sendMessageSchema);
      
      if (!this.workspaceId) {
        throw new ApiError(
          'Workspace ID required for sending messages',
          ErrorCode.INTERNAL_ERROR,
          500
        );
      }
      
      // First check if session exists
      try {
        await this.sessionManager.getSession(sessionId);
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
      
      // Get the session coordinator from the services registry
      const coordinator = await getSessionCoordinatorForRequest(
        this.workspaceId,
        '', // Path is obtained inside the helper function
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
      
      if (!this.workspaceId) {
        throw new ApiError(
          'Workspace ID required for streaming messages',
          ErrorCode.INTERNAL_ERROR,
          500
        );
      }
      
      // Check if session exists first
      try {
        await this.sessionManager.getSession(sessionId);
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
      
      // Store these values for use in the ReadableStream
      const workspaceId = this.workspaceId;
      const sessionManager = this.sessionManager;
      
      // Create a readable stream for the response
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Get the session coordinator from the services registry
            const coordinator = await getSessionCoordinatorForRequest(
              workspaceId,
              '',
              sessionId
            );
            
            // Process the message non-streaming for now
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
