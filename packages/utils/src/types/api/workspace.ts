/**
 * Workspace API types
 * 
 * Types for workspace-related API operations
 */

/**
 * Workspace response object returned by API
 */
export interface WorkspaceResponse {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Optional description */
  description: string | null;
  /** Filesystem path */
  path: string;
}

/**
 * Workspace list response
 */
export type WorkspaceListResponse = WorkspaceResponse[];

/**
 * Parameters for creating a new workspace
 */
export interface CreateWorkspaceRequest {
  /** Workspace name */
  name: string;
  /** Optional description */
  description?: string;
  /** Filesystem path */
  path: string;
}

/**
 * Parameters for updating a workspace
 */
export interface UpdateWorkspaceRequest {
  /** New name (optional) */
  name?: string;
  /** New description (optional) */
  description?: string;
}

/**
 * Response when getting workspace statistics
 */
export interface WorkspaceStatsResponse {
  /** Number of sessions */
  sessionCount: number;
  /** Number of files */
  fileCount: number;
  /** Number of active tools */
  toolCount: number;
  /** Last activity timestamp */
  lastActivity?: Date | string;
}