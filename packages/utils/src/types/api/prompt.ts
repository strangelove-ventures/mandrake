/**
 * Prompt API types
 * 
 * Types for prompt configuration API operations
 */

import type { PromptConfig } from '../workspace';

/**
 * Prompt configuration response
 */
export interface PromptConfigResponse extends PromptConfig {}

/**
 * Parameters for updating prompt configuration
 */
export interface UpdatePromptConfigRequest {
  /** System message */
  system?: string;
  /** Human message template */
  human?: string;
  /** Assistant message template */
  assistant?: string;
  /** Tool message template */
  tool?: string;
}

/**
 * Rendered prompt response
 */
export interface RenderedPromptResponse {
  /** Rendered system message */
  system: string;
  /** Rendered human message template */
  human: string;
  /** Rendered assistant message template */
  assistant: string;
  /** Rendered tool message template */
  tool: string;
}

/**
 * Parameters for rendering a prompt
 */
export interface RenderPromptRequest {
  /** Variables for rendering the prompt */
  variables?: Record<string, string>;
}