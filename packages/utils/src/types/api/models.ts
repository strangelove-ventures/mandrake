/**
 * Models API types
 * 
 * Types for model and provider-related API operations
 */

import type { 
  ProviderType, 
  ProviderConfig,
  ModelConfig
} from '../../models/schemas';

/**
 * Provider response object
 */
export interface ProviderResponse {
  /** Unique identifier */
  id: string;
  /** Provider type */
  type: ProviderType;
  /** Provider name */
  name: string;
  /** Provider configuration */
  config: ProviderConfig;
}

/**
 * List of providers response
 */
export type ProviderListResponse = ProviderResponse[];

/**
 * Parameters for creating a provider
 */
export interface CreateProviderRequest {
  /** Provider type */
  type: ProviderType;
  /** Provider name */
  name: string;
  /** Provider configuration */
  config: ProviderConfig;
}

/**
 * Parameters for updating a provider
 */
export interface UpdateProviderRequest {
  /** Provider type */
  type?: ProviderType;
  /** Provider name */
  name?: string;
  /** Provider configuration */
  config?: ProviderConfig;
}

/**
 * Model response object
 */
export interface ModelResponse {
  /** Unique identifier */
  id: string;
  /** Provider ID */
  providerId: string;
  /** Model name */
  name: string;
  /** Model type */
  type: string;
  /** Model configuration */
  config: ModelConfig;
}

/**
 * List of models response
 */
export type ModelListResponse = ModelResponse[];

/**
 * Parameters for creating a model
 */
export interface CreateModelRequest {
  /** Provider ID */
  providerId: string;
  /** Model name */
  name: string;
  /** Model type */
  type: string;
  /** Model configuration */
  config: ModelConfig;
}

/**
 * Parameters for updating a model
 */
export interface UpdateModelRequest {
  /** Provider ID */
  providerId?: string;
  /** Model name */
  name?: string;
  /** Model type */
  type?: string;
  /** Model configuration */
  config?: ModelConfig;
}

/**
 * Active model response
 */
export interface ActiveModelResponse {
  /** Model ID */
  modelId: string | null;
}

/**
 * Parameters for setting the active model
 */
export interface SetActiveModelRequest {
  /** Model ID */
  modelId: string | null;
}