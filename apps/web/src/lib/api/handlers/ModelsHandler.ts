import { NextRequest } from 'next/server';
import { WorkspaceManager } from '@mandrake/workspace';
import { ApiError, ErrorCode } from '../middleware/errorHandling';
import { validateBody } from '../middleware/validation';
import { ModelConfig, modelConfigSchema, ProviderConfig, providerConfigSchema } from '@mandrake/utils';

/**
 * Handles models operations for both system and workspace levels
 */
export class ModelsHandler {
  constructor(
    private workspaceId?: string, 
    private workspaceManager?: WorkspaceManager
  ) {}

  /**
   * Lists all models
   * @returns Record of model ID to ModelConfig
   */
  async listModels(): Promise<Record<string, ModelConfig>> {
    try {
      if (this.workspaceId && this.workspaceManager) {
        // Workspace-specific implementation
        return this.workspaceManager.models.listModels();
      } else {
        // System-level implementation
        throw new ApiError(
          'System-level models not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to list models: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Lists all model providers
   * @returns Record of provider ID to ProviderConfig
   */
  async listProviders(): Promise<Record<string, ProviderConfig>> {
    try {
      if (this.workspaceId && this.workspaceManager) {
        // Workspace-specific implementation
        return this.workspaceManager.models.listProviders();
      } else {
        // System-level implementation
        throw new ApiError(
          'System-level providers not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to list providers: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Adds a new model
   * @param req HTTP request with model data
   * @returns Promise resolving when model is added
   */
  async addModel(modelId: string, req: NextRequest): Promise<void> {
    try {
      // Import the schema from workspace package
      const data = await validateBody(req, modelConfigSchema);
      
      if (this.workspaceId && this.workspaceManager) {
        // Workspace-specific implementation
        return this.workspaceManager.models.addModel(modelId, data);
      } else {
        // System-level implementation
        throw new ApiError(
          'System-level models not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to add model: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Adds a new provider
   * @param providerId Provider ID
   * @param req HTTP request with provider data
   * @returns Promise resolving when provider is added
   */
  async addProvider(providerId: string, req: NextRequest): Promise<void> {
    try {
      const data = await validateBody(req, providerConfigSchema);
      
      if (this.workspaceId && this.workspaceManager) {
        // Workspace-specific implementation
        return this.workspaceManager.models.addProvider(providerId, data);
      } else {
        // System-level implementation
        throw new ApiError(
          'System-level providers not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to add provider: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Gets a specific model by ID
   * @param modelId Model ID
   * @returns The model configuration
   */
  async getModelDetails(modelId: string): Promise<ModelConfig> {
    try {
      if (this.workspaceId && this.workspaceManager) {
        // Workspace-specific implementation
        try {
          return await this.workspaceManager.models.getModel(modelId);
        } catch (error) {
          throw new ApiError(
            `Model not found: ${modelId}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404
          );
        }
      } else {
        // System-level implementation
        throw new ApiError(
          'System-level models not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to get model: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Gets a specific provider by ID
   * @param providerId Provider ID
   * @returns The provider configuration
   */
  async getProviderDetails(providerId: string): Promise<ProviderConfig> {
    try {
      if (this.workspaceId && this.workspaceManager) {
        // Workspace-specific implementation
        try {
          return await this.workspaceManager.models.getProvider(providerId);
        } catch (error) {
          throw new ApiError(
            `Provider not found: ${providerId}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404
          );
        }
      } else {
        // System-level implementation
        throw new ApiError(
          'System-level providers not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to get provider: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Updates a model
   * @param modelId Model ID
   * @param req HTTP request with model data
   */
  async updateModel(modelId: string, req: NextRequest): Promise<void> {
    try {
      // Make schema partial for updates
      const data = await validateBody(req, modelConfigSchema.partial());
      
      if (this.workspaceId && this.workspaceManager) {
        try {
          // Check if model exists first
          await this.workspaceManager.models.getModel(modelId);
          return await this.workspaceManager.models.updateModel(modelId, data);
        } catch (error) {
          if (error instanceof ApiError) throw error;
          throw new ApiError(
            `Model not found: ${modelId}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404
          );
        }
      } else {
        // System-level implementation
        throw new ApiError(
          'System-level models not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to update model: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Updates a provider
   * @param providerId Provider ID
   * @param req HTTP request with provider data
   */
  async updateProvider(providerId: string, req: NextRequest): Promise<void> {
    try {
      const data = await validateBody(req, providerConfigSchema.partial());
      
      if (this.workspaceId && this.workspaceManager) {
        try {
          // Check if provider exists first
          await this.workspaceManager.models.getProvider(providerId);
          return await this.workspaceManager.models.updateProvider(providerId, data);
        } catch (error) {
          if (error instanceof ApiError) throw error;
          throw new ApiError(
            `Provider not found: ${providerId}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404
          );
        }
      } else {
        // System-level implementation
        throw new ApiError(
          'System-level providers not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to update provider: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Removes a model
   * @param modelId Model ID
   */
  async removeModel(modelId: string): Promise<void> {
    try {
      if (this.workspaceId && this.workspaceManager) {
        try {
          // Check if model exists first
          await this.workspaceManager.models.getModel(modelId);
          return await this.workspaceManager.models.removeModel(modelId);
        } catch (error) {
          if (error instanceof ApiError) throw error;
          throw new ApiError(
            `Model not found: ${modelId}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404
          );
        }
      } else {
        // System-level implementation
        throw new ApiError(
          'System-level models not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to remove model: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Removes a provider
   * @param providerId Provider ID
   */
  async removeProvider(providerId: string): Promise<void> {
    try {
      if (this.workspaceId && this.workspaceManager) {
        try {
          // Check if provider exists first  
          await this.workspaceManager.models.getProvider(providerId);
          return await this.workspaceManager.models.removeProvider(providerId);
        } catch (error) {
          if (error instanceof ApiError) throw error;
          throw new ApiError(
            `Provider not found: ${providerId}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404
          );
        }
      } else {
        // System-level implementation
        throw new ApiError(
          'System-level providers not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to remove provider: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Gets the active model ID
   */
  async getActiveModel(): Promise<string> {
    try {
      if (this.workspaceId && this.workspaceManager) {
        return this.workspaceManager.models.getActive();
      } else {
        // System-level implementation
        throw new ApiError(
          'System-level models not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to get active model: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Sets the active model
   * @param modelId Model ID to set as active
   */
  async setActiveModel(modelId: string): Promise<void> {
    try {
      if (this.workspaceId && this.workspaceManager) {
        return this.workspaceManager.models.setActive(modelId);
      } else {
        // System-level implementation
        throw new ApiError(
          'System-level models not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to set active model: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }
}