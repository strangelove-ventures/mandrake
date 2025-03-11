/**
 * Types for prompt configuration components
 */

/**
 * Base prompt configuration
 */
export interface PromptConfig {
  instructions: string;
  includeWorkspaceMetadata: boolean;
  includeSystemInfo: boolean;
  includeDateTime: boolean;
}

/**
 * Props for prompt configuration components
 */
export interface PromptComponentProps {
  isWorkspace?: boolean;
  workspaceId?: string;
}

/**
 * State for editing the prompt
 */
export interface PromptEditState {
  instructions: string;
  includeWorkspaceMetadata: boolean;
  includeSystemInfo: boolean;
  includeDateTime: boolean;
}
