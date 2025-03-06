# Mandrake API Development Guide

## Commands
- Build: `bun run build`
- Development: `bun dev`
- Tests: `bun test`
- Clean: `bun run clean`

## Package Structure
- `src/index.ts` - Main entry point and server setup
- `src/managers.ts` - Manager initialization and access
- `src/routes/` - Route definitions by functionality
- `src/types.ts` - TypeScript types for the API
- `tests/` - API test files

## Manager Methods
These are the correct method names for each manager:

### MandrakeConfigManager (config)
- `getConfig()` - Get current configuration
- `updateConfig(config)` - Update configuration
- `registerWorkspace(workspace)` - Register a workspace 
- `unregisterWorkspaceById(id)` - Unregister a workspace
- `listWorkspaces()` - List all workspaces
- `findWorkspaceById(id)` - Find a workspace by ID

### WorkspaceConfigManager (workspace.config)
- `getConfig()` - Get current configuration
- `updateConfig(config)` - Update configuration

### ToolsManager (tools)
- `listConfigSets()` - List tool configurations
- `getConfigSet(id)` - Get a tool configuration
- `addConfigSet(id, config)` - Add a tool configuration
- `updateConfigSet(id, config)` - Update a tool configuration
- `removeConfigSet(id)` - Remove a tool configuration
- `getActive()` - Get active tool configuration set
- `setActive(id)` - Set active tool configuration set

### ModelsManager (models)
- `listModels()` - List models
- `getModel(id)` - Get a model
- `addModel(id, config)` - Add a model
- `updateModel(id, config)` - Update a model
- `removeModel(id)` - Remove a model
- `listProviders()` - List providers
- `getProvider(id)` - Get a provider
- `addProvider(id, config)` - Add a provider
- `updateProvider(id, config)` - Update a provider
- `removeProvider(id)` - Remove a provider
- `getActive()` - Get active model
- `setActive(id)` - Set active model

### PromptManager (prompt)
- `getConfig()` - Get prompt configuration
- `updateConfig(config)` - Update prompt configuration

### FilesManager (files)
- `list(active)` - List files
- `get(name)` - Get a file
- `create(name, content, active)` - Create a file
- `update(name, content)` - Update a file
- `delete(name)` - Delete a file
- `setActive(name, active)` - Set a file's active status

### DynamicContextManager (dynamic)
- `list()` - List dynamic context methods
- `get(id)` - Get a specific dynamic context method
- `create(config)` - Create a dynamic context method
- `update(id, updates)` - Update a dynamic context method
- `delete(id)` - Delete a dynamic context method
- `setEnabled(id, enabled)` - Enable/disable a dynamic context method

### SessionManager (sessions)
- `createSession(opts)` - Create a session
- `getSession(id)` - Get a session
- `listSessions(opts)` - List sessions
- `updateSession(id, updates)` - Update a session
- `deleteSession(id)` - Delete a session
- `createRound(opts)` - Create a round
- `getRound(id)` - Get a round
- `listRounds(sessionId)` - List rounds for a session
- `listTurns(responseId)` - List turns for a response

### MCPManager (mcpManager)
- `startServer(type, config)` - Start an MCP server
- `stopServer(id)` - Stop an MCP server
- `listTools(serverId)` - List tools for a server
- `listAllTools()` - List all tools from all servers
- `invokeTool(serverId, toolName, params)` - Invoke a tool

## Current Status
The API currently has passing tests for base functionality, but is still in active development. Some routes use mock implementations for testing, while others use the actual manager implementations from other packages.

## Development Workflow
1. Make changes to the API code
2. Run tests to verify functionality
3. Start the development server to test with the frontend
4. Update documentation as needed

## Route Organization
Routes are organized by functionality and can be mounted at both system and workspace levels.

## Implementation Notes
- Use async/await for all asynchronous operations
- Implement proper error handling with try/catch blocks
- Use c.json() for JSON responses, c.body() for streaming
- Follow HTTP status code conventions (200, 201, 400, 404, 500, etc.)
- Pass managers to routes via context when possible