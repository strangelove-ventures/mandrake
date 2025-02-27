import { NextRequest } from 'next/server';
import { SessionManager } from '@mandrake/workspace';
import { ApiError, ErrorCode } from '../middleware/errorHandling';
import { validateBody } from '../middleware/validation';
import { z } from 'zod';

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

/**
 * Handles CRUD operations for session data
 */
export class SessionManagerHandler {
  /**
   * Creates a new SessionManagerHandler
   * @param sessionManager The session manager to use for data operations
   * @param workspaceId Optional workspace ID (required for some operations)
   */
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
}
