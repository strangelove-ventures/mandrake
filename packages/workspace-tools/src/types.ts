import { z } from 'zod';
import { WorkspaceManager } from '@mandrake/workspace';

/**
 * Context provided to all workspace tools
 */
export interface WorkspaceToolContext {
  workspace: WorkspaceManager;
  workingDir: string;
  allowedDirs: string[];
}

/**
 * Standard response format for all tool operations
 */
export interface ToolResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

/**
 * Base tool configuration interface
 */
export interface WorkspaceTool {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  execute: (args: unknown, context: WorkspaceToolContext) => Promise<ToolResponse>;
}

/**
 * Common error types for workspace tools
 */
export enum WorkspaceToolErrorCode {
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',
  OPERATION_FAILED = 'OPERATION_FAILED'
}

/**
 * Error class for workspace tool operations
 */
export class WorkspaceToolError extends Error {
  constructor(
    message: string, 
    public code: WorkspaceToolErrorCode,
    public cause?: Error
  ) {
    super(message);
    this.name = 'WorkspaceToolError';
  }
}