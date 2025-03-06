import { Hono, type Context } from 'hono';
import type { Managers, ManagerAccessors } from '../types';
import { allToolRoutes } from './tools';
import { modelsRoutes, providersRoutes } from './models';
import { promptRoutes } from './prompt';
import { workspaceConfigRoutes } from './config';
import { filesRoutes } from './files';
import { dynamicContextRoutes } from './dynamic';
import { workspaceSessionsRoutes } from './sessions';
import { WorkspaceManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { workspaceManagementRoutes } from './workspace';

/**
 * Create workspace-level routes for the Mandrake API
 * @param managers All available managers
 * @param accessors Functions to access specific managers
 */
export function workspaceRoutes(managers: Managers, accessors: ManagerAccessors) {
  const app = new Hono();
  
  // Mount the workspace management routes
  app.route('/', workspaceManagementRoutes(managers, accessors));
  
  // Create a shared workspace router for specific workspace resources
  const workspaceRouter = new Hono();
  
  // Add middleware to inject workspace resources
  workspaceRouter.use('*', async (c: Context, next) => {
    const workspaceId = c.req.param('workspaceId');
    const workspace = accessors.getWorkspaceManager((workspaceId as string));
    const mcpManager = accessors.getMcpManager((workspaceId as string));
      
    if (!workspace) {
      return c.json({ error: 'Workspace not found' }, 404);
    }
    
    // Make these available to all subroutes)
    (c as any).set('workspace', workspace);
    (c as any).set('mcpManager', mcpManager);
    (c as any).set('workspaceId', workspaceId);
    
    await next();
  });
  
  // Create wrapper routes that extract necessary managers from context
  function createConfigRouter(c: any) {
    const workspace = c.get('workspace') as WorkspaceManager;
    return workspaceConfigRoutes(workspace.config);
  }
  
  function createToolsRouter(c: any) {
    const workspace = c.get('workspace') as WorkspaceManager;
    const mcpManager = c.get('mcpManager') as MCPManager;
    return allToolRoutes(workspace.tools, mcpManager);
  }
  
  function createModelsRouter(c: any) {
    const workspace = c.get('workspace') as WorkspaceManager;
    return modelsRoutes(workspace.models);
  }
  
  function createProvidersRouter(c: any) {
    const workspace = c.get('workspace') as WorkspaceManager;
    return providersRoutes(workspace.models);
  }
  
  function createPromptRouter(c: any) {
    const workspace = c.get('workspace') as WorkspaceManager;
    return promptRoutes(workspace.prompt);
  }
  
  function createFilesRouter(c: any) {
    const workspace = c.get('workspace') as WorkspaceManager;
    return filesRoutes(workspace.files);
  }
  
  function createDynamicRouter(c: any) {
    const workspace = c.get('workspace') as WorkspaceManager;
    return dynamicContextRoutes(workspace.dynamic);
  }
  
  function createSessionsRouter(c: any) {
    const workspace = c.get('workspace') as WorkspaceManager;
    const workspaceId = c.get('workspaceId') as string;
    return workspaceSessionsRoutes(managers, accessors, workspaceId, workspace);
  }
  
  // Mount resource routes
  workspaceRouter.all('/config/*', async (c) => {
    return createConfigRouter(c).fetch(c.req.raw, c.env);
  });
  
  workspaceRouter.all('/tools/*', async (c) => {
    return createToolsRouter(c).fetch(c.req.raw, c.env);
  });
  
  workspaceRouter.all('/models/*', async (c) => {
    return createModelsRouter(c).fetch(c.req.raw, c.env);
  });
  
  workspaceRouter.all('/providers/*', async (c) => {
    return createProvidersRouter(c).fetch(c.req.raw, c.env);
  });
  
  workspaceRouter.all('/prompt/*', async (c) => {
    return createPromptRouter(c).fetch(c.req.raw, c.env);
  });
  
  workspaceRouter.all('/files/*', async (c) => {
    return createFilesRouter(c).fetch(c.req.raw, c.env);
  });
  
  workspaceRouter.all('/dynamic/*', async (c) => {
    return createDynamicRouter(c).fetch(c.req.raw, c.env);
  });
  
  workspaceRouter.all('/sessions/*', async (c) => {
    return createSessionsRouter(c).fetch(c.req.raw, c.env);
  });
  
  // For root paths, handle them explicitly
  workspaceRouter.all('/config', async (c) => {
    return createConfigRouter(c).fetch(c.req.raw, c.env);
  });
  
  workspaceRouter.all('/tools', async (c) => {
    return createToolsRouter(c).fetch(c.req.raw, c.env);
  });
  
  workspaceRouter.all('/models', async (c) => {
    return createModelsRouter(c).fetch(c.req.raw, c.env);
  });
  
  workspaceRouter.all('/providers', async (c) => {
    return createProvidersRouter(c).fetch(c.req.raw, c.env);
  });
  
  workspaceRouter.all('/prompt', async (c) => {
    return createPromptRouter(c).fetch(c.req.raw, c.env);
  });
  
  workspaceRouter.all('/files', async (c) => {
    return createFilesRouter(c).fetch(c.req.raw, c.env);
  });
  
  workspaceRouter.all('/dynamic', async (c) => {
    return createDynamicRouter(c).fetch(c.req.raw, c.env);
  });
  
  workspaceRouter.all('/sessions', async (c) => {
    return createSessionsRouter(c).fetch(c.req.raw, c.env);
  });
  
  // Mount the workspace router
  app.route('/:workspaceId', workspaceRouter);
  
  return app;
}