/**
 * Files API types
 * 
 * Types for file-related API operations
 */

import type { FileInfo } from '../workspace';

/**
 * File response object
 */
export interface FileResponse extends FileInfo {}

/**
 * List of files response
 */
export type FileListResponse = FileResponse[];

/**
 * Parameters for creating a file
 */
export interface CreateFileRequest {
  /** File name */
  name: string;
  /** File content */
  content: string;
  /** Optional mime type */
  type?: string;
  /** Whether the file should be active (default: true) */
  active?: boolean;
}

/**
 * Parameters for updating a file
 */
export interface UpdateFileRequest {
  /** New file name */
  name?: string;
  /** New file content */
  content?: string;
  /** New mime type */
  type?: string;
}

/**
 * Parameters for setting file active state
 */
export interface SetFileActiveRequest {
  /** Active state */
  active: boolean;
}

/**
 * File content response
 */
export interface FileContentResponse {
  /** File ID */
  id: string;
  /** File name */
  name: string;
  /** File content */
  content: string;
  /** Mime type */
  type: string;
  /** Active state */
  active: boolean;
}