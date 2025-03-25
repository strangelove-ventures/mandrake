import { Hono } from 'hono';
import { toolsConfigRoutes, toolsOperationRoutes, serverRoutes, allToolRoutes } from './tools';
import { modelsRoutes, providersRoutes } from './models';
import { promptRoutes } from './prompt';
import { mandrakeConfigRoutes } from './config';
import { sessionDatabaseRoutes, systemSessionDatabaseRoutes } from './sessions';
import { systemSessionStreamingRoutes } from './streaming';
import { dynamicContextRoutes } from './dynamic';
import { filesRoutes } from './files';
import { ServiceRegistry } from '../services/registry';
import { MandrakeManagerAdapter, MCPManagerAdapter } from '../services/registry/adapters';

/**
 * Create system-level routes for the Mandrake API
 * @param registry Service registry for accessing all managed services
 */
export function systemRoutes(registry: ServiceRegistry) {
  const app = new Hono();
  
  // Get the MandrakeManager from registry
  const getMandrakeManager = () => {
    const adapter = registry.getService<MandrakeManagerAdapter>('mandrake-manager');
    if (!adapter) {
      throw new Error('MandrakeManager service not found in registry');
    }
    return adapter.getManager();
  };
  
  // Get the System MCP Manager from registry
  const getMcpManager = () => {
    const adapter = registry.getService<MCPManagerAdapter>('mcp-manager');
    if (!adapter) {
      throw new Error('MCPManager service not found in registry');
    }
    return adapter.getManager();
  };
  
  // System info endpoint
  app.get('/', (c) => {
    try {
      const mandrakeManager = getMandrakeManager();
      
      // Get service status information
      const serviceStatuses = Array.from(registry.getAllServiceStatuses().entries())
        .filter(([key]) => !key.includes(':')) // Only include system-level services
        .map(([key, status]) => ({
          type: key,
          healthy: status.isHealthy,
          statusCode: status.statusCode,
          message: status.message
        }));
      
      return c.json({
        version: process.env.npm_package_version || '0.1.0',
        path: mandrakeManager.paths.root,
        workspaces: mandrakeManager.listWorkspaces().length,
        services: serviceStatuses
      });
    } catch (error) {
      console.error('Error in system info endpoint:', error);
      return c.json({ 
        error: 'Failed to get system information',
        message: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  });
  
  // Mount all routes using the registry service pattern
  
  // Config routes
  app.route('/config', (c) => {
    try {
      const mandrakeManager = getMandrakeManager();
      return mandrakeConfigRoutes(mandrakeManager.config).fetch(c.req.raw, c.env);
    } catch (error) {
      console.error('Error accessing config routes:', error);
      return c.json({ error: 'Config service unavailable' }, 503);
    }
  });
  
  // Tool routes
  app.route('/tools', (c) => {
    try {
      const mandrakeManager = getMandrakeManager();
      const mcpManager = getMcpManager();
      return allToolRoutes(mandrakeManager.tools, mcpManager).fetch(c.req.raw, c.env);
    } catch (error) {
      console.error('Error accessing tools routes:', error);
      return c.json({ error: 'Tools service unavailable' }, 503);
    }
  });
  
  // Model routes
  app.route('/models', (c) => {
    try {
      const mandrakeManager = getMandrakeManager();
      return modelsRoutes(mandrakeManager.models).fetch(c.req.raw, c.env);
    } catch (error) {
      console.error('Error accessing models routes:', error);
      return c.json({ error: 'Models service unavailable' }, 503);
    }
  });
  
  // Provider routes
  app.route('/providers', (c) => {
    try {
      const mandrakeManager = getMandrakeManager();
      return providersRoutes(mandrakeManager.models).fetch(c.req.raw, c.env);
    } catch (error) {
      console.error('Error accessing providers routes:', error);
      return c.json({ error: 'Providers service unavailable' }, 503);
    }
  });
  
  // Prompt routes
  app.route('/prompt', (c) => {
    try {
      const mandrakeManager = getMandrakeManager();
      return promptRoutes(mandrakeManager.prompt).fetch(c.req.raw, c.env);
    } catch (error) {
      console.error('Error accessing prompt routes:', error);
      return c.json({ error: 'Prompt service unavailable' }, 503);
    }
  });
  
  // Session database routes - needs a SessionManagerAdapter to be implemented
  app.route('/sessions', (c) => {
    return c.json({
      error: 'Not implemented yet',
      message: 'The SessionManagerAdapter needs to be implemented before using this route through the ServiceRegistry'
    }, 501);
  });
  
  // Session streaming routes - needs a SessionCoordinatorAdapter to be fully implemented
  app.route('/streaming', (c) => {
    return c.json({
      error: 'Not implemented yet',
      message: 'The SessionCoordinatorAdapter needs to be fully integrated before using this route through the ServiceRegistry'
    }, 501);
  });
  
  // Dynamic context routes
  app.route('/dynamic', (c) => {
    try {
      const mandrakeManager = getMandrakeManager();
      if (mandrakeManager.dynamic) {
        return dynamicContextRoutes(mandrakeManager.dynamic).fetch(c.req.raw, c.env);
      }
      return c.json({ error: 'Dynamic context not available' }, 404);
    } catch (error) {
      console.error('Error accessing dynamic routes:', error);
      return c.json({ error: 'Dynamic context service unavailable' }, 503);
    }
  });
  
  // Files routes
  app.route('/files', (c) => {
    try {
      const mandrakeManager = getMandrakeManager();
      if (mandrakeManager.files) {
        return filesRoutes(mandrakeManager.files).fetch(c.req.raw, c.env);
      }
      return c.json({ error: 'Files manager not available' }, 404);
    } catch (error) {
      console.error('Error accessing files routes:', error);
      return c.json({ error: 'Files service unavailable' }, 503);
    }
  });
  
  // Service status endpoint
  app.get('/services/status', (c) => {
    try {
      // Get all system-level services (without workspace prefix)
      const systemServices = Array.from(registry.getAllServiceStatuses().entries())
        .filter(([key]) => !key.includes(':'))
        .reduce((acc, [key, status]) => {
          acc[key] = status;
          return acc;
        }, {} as Record<string, any>);
        
      return c.json(systemServices);
    } catch (error) {
      console.error('Error getting service status:', error);
      return c.json({ error: 'Failed to get service status' }, 500);
    }
  });
  
  return app;
}