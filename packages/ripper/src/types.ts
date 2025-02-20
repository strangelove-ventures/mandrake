import type { FastMCP } from 'fastmcp';

export interface RipperOptions {
  workspacePath?: string;  // Base path for file operations
  allowedPaths?: string[]; // List of allowed paths
}

export interface ToolContext {
  server: FastMCP;
  options: RipperOptions;
}

// Add other types as needed
