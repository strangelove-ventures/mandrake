import { Hono } from 'hono';
import type { Managers, ManagerAccessors } from '../types';
import { toolsConfigRoutes, toolsOperationRoutes, serverRoutes, allToolRoutes } from './tools';
import { modelsRoutes, providersRoutes } from './models';
import { promptRoutes } from './prompt';
import { mandrakeConfigRoutes } from './config';
import { systemSessionsRoutes } from './sessions';
import { dynamicContextRoutes } from './dynamic';
import { filesRoutes } from './files';

/**
 * Create system-level routes for the Mandrake API
 * @param managers All available managers
 * @param accessors Functions to access specific managers
 */
export function systemRoutes(managers: Managers, accessors: ManagerAccessors) {
  const app = new Hono();
  
  // System info endpoint
  app.get('/', (c) => {
    return c.json({
      version: process.env.npm_package_version || '0.1.0',
      path: managers.mandrakeManager.paths.root,
      workspaces: managers.workspaceManagers.size
    });
  });
  
  // Mount all routes using the consistent pattern
  
  // Config routes
  app.route('/config', mandrakeConfigRoutes(managers.mandrakeManager.config));
  
  // Tool routes - using the allToolRoutes that combines configs, servers and operations
  app.route('/tools', allToolRoutes(managers.mandrakeManager.tools, managers.systemMcpManager));
  
  // Model routes
  app.route('/models', modelsRoutes(managers.mandrakeManager.models));
  
  // Provider routes
  app.route('/providers', providersRoutes(managers.mandrakeManager.models));
  
  // Prompt routes
  app.route('/prompt', promptRoutes(managers.mandrakeManager.prompt));
  
  // Session routes - using the systemSessionsRoutes helper
  app.route('/sessions', systemSessionsRoutes(managers, accessors));
  
  return app;
}