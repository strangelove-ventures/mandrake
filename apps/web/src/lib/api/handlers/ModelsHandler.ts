import { NextRequest } from 'next/server';
import { ModelsManager } from '@mandrake/workspace';
import { ApiError, ErrorCode } from '../middleware/errorHandling';
import { validateBody } from '../middleware/validation';
import { ModelConfig, modelConfigSchema, ProviderConfig, providerConfigSchema } from '@mandrake/utils';

/**
 * Handles models operations for both system and workspace levels
 */
export class ModelsHandler {
  constructor(
    private modelsManager: ModelsManager
  ) {}

  /**
   * Lists all models
   * @returns Record of model ID to ModelConfig
   */
  async listModels(): Promise<Record<string, ModelConfig>> {
    try {
      return this.modelsManager.listModels();;
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
      return this.modelsManager.listProviders();
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
      return this.modelsManager.addModel(modelId, data);
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
      return this.modelsManager.addProvider(providerId, data);
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
      return await this.modelsManager.getModel(modelId);
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
      return await this.modelsManager.getProvider(providerId);
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
      await this.modelsManager.getModel(modelId);
      return await this.modelsManager.updateModel(modelId, data);
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
      await this.modelsManager.getProvider(providerId);
      return await this.modelsManager.updateProvider(providerId, data);
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
      await this.modelsManager.getModel(modelId);
      return await this.modelsManager.removeModel(modelId);
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
      await this.modelsManager.getProvider(providerId);
      return await this.modelsManager.removeProvider(providerId);
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
      return this.modelsManager.getActive();
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
      return this.modelsManager.setActive(modelId);
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