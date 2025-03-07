/**
 * Dynamic Context API types
 * 
 * Types for dynamic context-related API operations
 */

import type { DynamicContextMethodConfig } from '../workspace';

/**
 * Dynamic context response object
 */
export interface DynamicContextResponse {
  /** Context ID */
  id: string;
  /** Context name */
  name: string;
  /** Context description */
  description: string;
  /** Whether the context is enabled */
  enabled: boolean;
  /** Context method configuration */
  method: DynamicContextMethodConfig;
}

/**
 * List of dynamic contexts response
 */
export type DynamicContextListResponse = DynamicContextResponse[];

/**
 * Parameters for creating a dynamic context
 */
export interface CreateDynamicContextRequest {
  /** Context name */
  name: string;
  /** Context description */
  description?: string;
  /** Whether the context is enabled */
  enabled?: boolean;
  /** Context method configuration */
  method: DynamicContextMethodConfig;
}

/**
 * Parameters for updating a dynamic context
 */
export interface UpdateDynamicContextRequest {
  /** New context name */
  name?: string;
  /** New context description */
  description?: string;
  /** New enabled state */
  enabled?: boolean;
  /** New context method configuration */
  method?: DynamicContextMethodConfig;
}

/**
 * Dynamic context content result
 */
export interface DynamicContextContentResponse {
  /** Context ID */
  id: string;
  /** Context name */
  name: string;
  /** Generated content */
  content: string;
  /** Timestamp when content was generated */
  timestamp: string;
}

/**
 * Parameters for generating context content
 */
export interface GenerateContextContentRequest {
  /** Optional parameters for the context method */
  params?: Record<string, any>;
}