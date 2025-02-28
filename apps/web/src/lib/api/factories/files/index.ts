import { NextRequest } from 'next/server';
import { listFiles, getFile } from './list';
import { createFile } from './create';
import { updateFile } from './update';
import { deleteFile } from './delete';
import { setFileActive } from './active';

/**
 * Creates handlers for files routes (workspace-level only)
 * @param workspaceScoped Whether these routes are scoped to a workspace
 */
export function createFilesRoutes(workspaceScoped = true) {
  return {
    /**
     * GET - List files or get a specific file
     */
    async GET(
      req: NextRequest,
      { params }: { params?: { id?: string, fileName?: string } } = {}
    ) {
      // If fileName is provided, get a specific file
      if (params?.fileName) {
        return getFile(req, { params, workspaceScoped });
      }
      // Otherwise, list all files
      return listFiles(req, { params, workspaceScoped });
    },
    
    /**
     * POST - Create a new file
     */
    async POST(
      req: NextRequest,
      { params }: { params?: { id?: string } } = {}
    ) {
      return createFile(req, { params, workspaceScoped });
    },
    
    /**
     * PUT - Update a file
     */
    async PUT(
      req: NextRequest,
      { params }: { params: { id?: string, fileName: string } }
    ) {
      return updateFile(req, { params, workspaceScoped });
    },
    
    /**
     * DELETE - Remove a file
     */
    async DELETE(
      req: NextRequest,
      { params }: { params: { id?: string, fileName: string } }
    ) {
      return deleteFile(req, { params, workspaceScoped });
    }
  };
}

/**
 * Creates handlers for active file routes
 * @param workspaceScoped Whether these routes are scoped to a workspace
 */
export function createFileActiveRoutes(workspaceScoped = true) {
  return {
    /**
     * PUT - Set file active state
     */
    async PUT(
      req: NextRequest,
      { params }: { params: { id?: string, fileName: string } }
    ) {
      return setFileActive(req, { params, workspaceScoped });
    }
  };
}
