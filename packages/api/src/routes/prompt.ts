import { Hono } from 'hono';
import { PromptManager } from '@mandrake/workspace';
import { type PromptConfig } from '@mandrake/workspace';

// Interface matching the test expectations for the prompt config
interface ApiPromptConfig {
  system: string;
  dateFormat?: string;
  metadata?: boolean;
  includeWorkspaceMetadata?: boolean;
  includeSystemInfo?: boolean;
  includeDateTime?: boolean;
}

/**
 * Transform internal PromptConfig to the API format expected by tests
 */
function toApiFormat(config: PromptConfig): ApiPromptConfig {
  return {
    system: config.instructions,
    metadata: config.includeWorkspaceMetadata || config.includeSystemInfo,
    dateFormat: config.includeDateTime ? 'YYYY-MM-DD' : undefined,
    // Include the original properties too for forwards compatibility
    includeWorkspaceMetadata: config.includeWorkspaceMetadata,
    includeSystemInfo: config.includeSystemInfo,
    includeDateTime: config.includeDateTime
  };
}

/**
 * Transform API format back to internal PromptConfig
 */
function fromApiFormat(apiConfig: ApiPromptConfig, original: PromptConfig): PromptConfig {
  return {
    instructions: apiConfig.system || original.instructions,
    includeWorkspaceMetadata: apiConfig.includeWorkspaceMetadata !== undefined 
      ? apiConfig.includeWorkspaceMetadata 
      : (apiConfig.metadata !== undefined ? apiConfig.metadata : original.includeWorkspaceMetadata),
    includeSystemInfo: apiConfig.includeSystemInfo !== undefined
      ? apiConfig.includeSystemInfo
      : (apiConfig.metadata !== undefined ? apiConfig.metadata : original.includeSystemInfo),
    includeDateTime: apiConfig.includeDateTime !== undefined
      ? apiConfig.includeDateTime
      : (apiConfig.dateFormat !== undefined ? true : original.includeDateTime)
  };
}

/**
 * Create reusable routes for prompt management
 * These routes can be mounted at either system or workspace level
 */
export function promptRoutes(promptManager: PromptManager) {
  const app = new Hono();
  
  // Get current prompt configuration
  app.get('/', async (c) => {
    try {
      const config = await promptManager.getConfig();
      return c.json(toApiFormat(config));
    } catch (error) {
      console.error('Error getting prompt configuration:', error);
      return c.json({ error: 'Failed to get prompt configuration' }, 500);
    }
  });
  
  // Update prompt configuration
  app.put('/', async (c) => {
    try {
      const apiConfig = await c.req.json() as ApiPromptConfig;
      const currentConfig = await promptManager.getConfig();
      const updatedConfig = fromApiFormat(apiConfig, currentConfig);
      
      await promptManager.updateConfig(updatedConfig);
      return c.json({ success: true });
    } catch (error) {
      console.error('Error updating prompt configuration:', error);
      return c.json({ error: 'Failed to update prompt configuration' }, 500);
    }
  });
  
  return app;
}