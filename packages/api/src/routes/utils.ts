import type { Context } from 'hono';
import type { ErrorHandler, ErrorResponse } from '../types';

/**
 * Standard error handler for API routes
 * @param error Error object
 * @param message Error message prefix
 * @returns ErrorResponse with formatted message and status
 */
export const handleError: ErrorHandler = (error: unknown, message: string): ErrorResponse => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`${message}: ${errorMessage}`);
  
  const response: ErrorResponse = {
    error: `${message}: ${errorMessage}`,
    status: 500
  };
  
  // Handle specific error types
  if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
    response.status = 404;
  } else if (errorMessage.includes('invalid') || errorMessage.includes('required')) {
    response.status = 400;
  } else if (errorMessage.includes('exists') || errorMessage.includes('duplicate')) {
    response.status = 409;
  } else if (errorMessage.includes('unauthorized') || errorMessage.includes('not allowed')) {
    response.status = 403;
  }
  
  return response;
};

/**
 * Send an error response from a route handler
 * @param c Hono context
 * @param error Error object or string
 * @param message Error message prefix
 * @returns JSON response with error details
 */
export const sendError = (c: Context, error: unknown, message: string) => {
  const response = handleError(error, message);
  return c.json({ error: response.error, status: response.status || 500 });
};

/**
 * Check if a workspace exists and return an error if not
 * @param c Hono context
 * @param workspaceId Workspace ID
 * @param getWorkspace Function to get workspace
 * @returns Object with exists flag and error response if applicable
 */
export const checkWorkspace = async <T>(
  c: Context,
  workspaceId: string,
  getWorkspace: (id: string) => T | undefined
) => {
  const workspace = getWorkspace(workspaceId);
  
  if (!workspace) {
    return {
      exists: false,
      error: c.json({ error: 'Workspace not found' }, 404)
    };
  }
  
  return { exists: true, workspace };
};