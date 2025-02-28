// lib/api/factories/models/index.ts
import { NextRequest } from 'next/server';
import { listModels, getModel } from './list';
import { createModel } from './create';
import { updateModel } from './update';
import { deleteModel } from './delete';
import { getActiveModel, setActiveModel } from './active';

/**
 * Creates handlers for model routes (both system and workspace-level)
 * @param workspaceScoped Whether these routes are scoped to a workspace
 */
export function createModelRoutes(workspaceScoped = false) {
  return {
    /**
     * GET - List models or get a specific model
     */
    async GET(
      req: NextRequest,
      { params }: { params?: { id?: string, modelId?: string } } = {}
    ) {
      // If modelId is provided, get a specific model
      if (params?.modelId) {
        return getModel(req, { params, workspaceScoped });
      }
      // Otherwise, list all models
      return listModels(req, { params, workspaceScoped });
    },

    /**
     * POST - Create a new model
     */
    async POST(
      req: NextRequest,
      { params }: { params?: { id?: string } } = {}
    ) {
      return createModel(req, { params, workspaceScoped });
    },

    /**
     * PUT - Update a model
     */
    async PUT(
      req: NextRequest,
      { params }: { params: { id?: string, modelId: string } }
    ) {
      return updateModel(req, { params, workspaceScoped });
    },

    /**
     * DELETE - Remove a model
     */
    async DELETE(
      req: NextRequest,
      { params }: { params: { id?: string, modelId: string } }
    ) {
      return deleteModel(req, { params, workspaceScoped });
    }
  };
}

/**
 * Creates handlers for active model routes (both system and workspace-level)
 * @param workspaceScoped Whether these routes are scoped to a workspace
 */
export function createActiveModelRoutes(workspaceScoped = false) {
  return {
    /**
     * GET - Get the active model
     */
    async GET(
      req: NextRequest,
      { params }: { params?: { id?: string } } = {}
    ) {
      return getActiveModel(req, { params, workspaceScoped });
    },

    /**
     * PUT - Set the active model
     */
    async PUT(
      req: NextRequest,
      { params }: { params?: { id?: string } } = {}
    ) {
      return setActiveModel(req, { params, workspaceScoped });
    }
  };
}