import { NextRequest } from 'next/server';
import { listModels, getModel, listProviders, getProvider } from './list';
import { createModel, createProvider } from './create';
import { updateModel, updateProvider } from './update';
import { deleteModel, deleteProvider } from './delete';
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
    GET: (
      req: NextRequest,
      { params }: { params?: { id?: string, modelId?: string } } = {}
    ) => {
      // If modelId is provided, get a specific model
      if (params?.modelId) {
        return getModel(req, { params: params as { modelId: string; id?: string }, workspaceScoped });
      }
      // Otherwise, list all models
      return listModels(req, { params, workspaceScoped });
    },

    /**
     * POST - Create a new model
     */
    POST: (
      req: NextRequest,
      { params }: { params?: { id?: string } } = {}
    ) => {
      return createModel(req, { params, workspaceScoped });
    },

    /**
     * PUT - Update a model
     */
    PUT: (
      req: NextRequest,
      { params }: { params: { id?: string, modelId: string } }
    ) => {
      return updateModel(req, { params, workspaceScoped });
    },

    /**
     * DELETE - Delete a model
     */
    DELETE: (
      req: NextRequest,
      { params }: { params: { id?: string, modelId: string } }
    ) => {
      return deleteModel(req, { params, workspaceScoped });
    }
  };
}

/**
 * Creates handlers for provider routes (both system and workspace-level)
 * @param workspaceScoped Whether these routes are scoped to a workspace
 */
export function createProviderRoutes(workspaceScoped = false) {
  return {
    /**
     * GET - List providers or get a specific provider
     */
    GET: (
      req: NextRequest,
      { params }: { params?: { id?: string, providerId?: string } } = {}
    ) => {
      // If providerId is provided, get a specific provider
      if (params?.providerId) {
        return getProvider(req, { params: params as { providerId: string; id?: string }, workspaceScoped });
      }
      // Otherwise, list all providers
      return listProviders(req, { params, workspaceScoped });
    },

    /**
     * POST - Create a new provider
     */
    POST: (
      req: NextRequest,
      { params }: { params?: { id?: string } } = {}
    ) => {
      return createProvider(req, { params, workspaceScoped });
    },

    /**
     * PUT - Update a provider
     */
    PUT: (
      req: NextRequest,
      { params }: { params: { id?: string, providerId: string } }
    ) => {
      return updateProvider(req, { params, workspaceScoped });
    },

    /**
     * DELETE - Delete a provider
     */
    DELETE: (
      req: NextRequest,
      { params }: { params: { id?: string, providerId: string } }
    ) => {
      return deleteProvider(req, { params, workspaceScoped });
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
    GET: (
      req: NextRequest,
      { params }: { params?: { id?: string } } = {}
    ) => {
      return getActiveModel(req, { params, workspaceScoped });
    },

    /**
     * PUT - Set the active model
     */
    PUT: (
      req: NextRequest,
      { params }: { params?: { id?: string } } = {}
    ) => {
      return setActiveModel(req, { params, workspaceScoped });
    }
  };
}

// Export individual functions
export {
  listModels, getModel, listProviders, getProvider,
  createModel, createProvider,
  updateModel, updateProvider,
  deleteModel, deleteProvider,
  getActiveModel, setActiveModel
};
