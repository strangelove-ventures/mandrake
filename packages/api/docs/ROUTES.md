# API Route Specifications

This document provides a framework for defining API routes in the packages/api package of the Mandrake monorepo, located at packages/api. The routes expose Mandrake’s functionality through a unified interface for system-level (/system) and workspace-level (/workspaces/:id) operations, using Hono as the framework. Instead of pre-defining exact endpoints, this guide prompts you, the implementor, to analyze the relevant manager objects from the workspace, mcp, and session packages and design routes based on their actual capabilities. This approach ensures the routes reflect the current implementation accurately.

## Overview

The API will provide RESTful endpoints and streaming responses to manage configurations, tools, models, prompts, files, dynamic context, and sessions. Routes are organized to reuse code between system and workspace levels where applicable, leveraging generic route functions in src/routes/. Your task is to examine each manager’s interface and propose routes that align with its functionality, considering both configuration management and operational actions (e.g., tool execution, session streaming).

## Base Structure

* System-Level Routes: /system/*- Managed by MandrakeManager and its sub-managers.
* Workspace-Level Routes: /workspaces/:workspaceId/* - Managed by WorkspaceManager instances from a map.
* Implementation: Define in src/routes/system.ts, src/routes/workspaces.ts, and reusable route files (e.g., src/routes/tools.ts).

## Route Planning Guidelines

1. For each manager listed below, follow these steps to create your route plan:
2. Locate the Manager: Refer to the specified file and class in the relevant package.
3. Analyze the Interface: Examine the public methods, properties, and types (e.g., in index.ts or types.ts) to understand its capabilities. Do not assume specific methods; look them up in the source.
4. Define Routes: Propose HTTP methods (GET, POST, PUT, DELETE), paths, request/response formats, and any streaming requirements based on the manager’s actual functionality.
5. Consider Reuse: Identify opportunities to reuse route logic between system and workspace levels (e.g., where managers are duplicated).
6. Document: Record your plan in the sections below, including a brief rationale for each endpoint.

## 1. System-Level Routes (/system)

### Mandrake Config Management

* Manager: MandrakeConfigManager
* Location: packages/workspace/src/managers/config.ts
* Task: Review the MandrakeConfigManager class (extends BaseConfigManager). Examine its public interface and the schema it manages (likely in packages/workspace/src/types/workspace/index.ts). Plan routes to manage the system-level JSON configuration file (e.g., ~/.mandrake/mandrake.json).
* Suggested Starting Point: Routes for reading and updating the configuration.

### Mandrake Tools Configuration Management

* Manager: ToolsManager (via MandrakeManager.tools)
* Location: packages/workspace/src/managers/tools.ts
* Task: Examine ToolsManager and its public interface (e.g., in index.ts and types.ts). This manager handles JSON configuration for tools (e.g., tools.json), not the running servers. Plan routes to manage these configurations at the system level.
* Suggested Starting Point: Routes for listing, adding, updating, and removing tool configurations.

### Mandrake MCP Server and Tool Operations

* Manager: MCPManager
* Location: packages/mcp/src/manager.ts
* Task: Inspect MCPManager and its public interface (e.g., methods for server management and tool operations), along with MCPServerImpl (packages/mcp/src/server.ts). This manager handles running MCP servers and operations like listing tools per server or invoking them. Plan routes for these operational aspects at the system level.
* Suggested Starting Point: Routes for starting/stopping servers, listing tools, and invoking tools.

### Mandrake Models Management

* Manager: ModelsManager (via MandrakeManager.models)
* Location: packages/workspace/src/managers/models.ts
* Task: Analyze ModelsManager and its public interface (e.g., in index.ts and types.ts). Plan routes to manage system-level model providers and their configurations based on its capabilities.
* Suggested Starting Point: Routes for managing model provider configurations.

### Mandrake Prompt Management

* Manager: PromptManager (via MandrakeManager.prompt)
* Location: packages/workspace/src/managers/prompt.ts
* Task: Review PromptManager and its public interface (e.g., in index.ts and types.ts). Plan routes to manage the system-level prompt configuration based on what it offers.
* Suggested Starting Point: Routes for getting and setting prompt configurations.

### Mandrake Sessions Management

* Manager: SessionManager (via MandrakeManager.sessions) and SessionCoordinator
* Location:
  * SessionManager: packages/workspace/src/managers/session.ts
  * SessionCoordinator: packages/session/src/coordinator.ts
* Task: Study SessionManager for session data management and SessionCoordinator for real-time interaction. Plan routes to create, retrieve, and manage sessions, including streaming responses, based on their interfaces.
* Suggested Starting Point: Routes for session creation, retrieval, and message streaming.

## 2. Workspace-Level Routes (/workspaces/:workspaceId)

### Workspace Management

* Manager: WorkspaceManager
* Location: packages/workspace/src/index.ts
* Task: Review WorkspaceManager and its public interface (e.g., properties like id, name, and methods like init). Plan routes to create and retrieve workspace metadata based on its capabilities.
* Suggested Starting Point: Routes for workspace creation and metadata retrieval.

### Workspace Config Management

* Manager: WorkspaceConfigManager (via WorkspaceManager.config)
* Location: packages/workspace/src/managers/workspaceConfig.ts
* Task: Analyze WorkspaceConfigManager and its public interface. Plan routes to manage the workspace-level JSON configuration (e.g., .ws/config/workspace.json) based on its functionality.
* Suggested Starting Point: Reuse logic from /system/config if applicable.

### Workspace Tools Configuration Management

* Manager: ToolsManager (via WorkspaceManager.tools)
* Location: packages/workspace/src/managers/tools.ts
* Task: Same as system-level ToolsManager, but scoped to a workspace. Plan routes to manage workspace-specific tool configurations (JSON-based) based on its interface.
* Suggested Starting Point: Reuse logic from /system/tools for configuration management.

### Workspace  MCP Server and Tool Operations

* Manager: MCPManager (via map in src/managers.ts)
* Location: packages/mcp/src/manager.ts
* Task: Similar to system-level MCPManager, but scoped to a workspace. Plan routes for managing running servers and tool operations (e.g., listing tools, invocation) based on its interface.
* Suggested Starting Point: Reuse operational logic from /system MCP routes, adjusted for workspace scope.

### Workspace Models Management

* Manager: ModelsManager (via WorkspaceManager.models)
* Location: packages/workspace/src/managers/models.ts
* Task: Same as system-level ModelsManager, scoped to a workspace. Plan routes for workspace-specific model providers based on its interface.
* Suggested Starting Point: Reuse logic from /system/models.

### Workspace Prompt Management

* Manager: PromptManager (via WorkspaceManager.prompt)
* Location: packages/workspace/src/managers/prompt.ts
* Task: Same as system-level PromptManager, scoped to a workspace. Plan routes for workspace-specific prompt configs based on its interface.
* Suggested Starting Point: Reuse logic from /system/prompt.

### Files Management

* Manager: FilesManager (via WorkspaceManager.files)
* Location: packages/workspace/src/managers/files.ts
* Task: Examine FilesManager and its public interface (e.g., in index.ts and types.ts). Plan routes to manage files in the workspace context (e.g., .ws/files/ or workspace root) based on its capabilities.
* Suggested Starting Point: Routes for listing, reading, and writing files.

### Dynamic Context Management

* Manager: DynamicContextManager (via WorkspaceManager.dynamic)
* Location: packages/workspace/src/managers/dynamic.ts
* Task: Review DynamicContextManager and its public interface (e.g., in index.ts and types.ts). Plan routes to manage workspace-specific dynamic context configurations based on its functionality.
* Suggested Starting Point: Routes for getting and setting dynamic context configs.

### Workspace Sessions Management

* Manager: SessionManager (via WorkspaceManager.sessions) and SessionCoordinator
* Location: Same as system-level sessions.
* Task: Plan routes similar to /system/sessions, but scoped to a workspace, based on their interfaces. Ensure streaming support for real-time responses.
* Suggested Starting Point: Reuse logic from /system/sessions, adjusting for workspace scope.

## Implementation Notes

* Code Reuse: Create generic route functions (e.g., toolsRoutes in src/routes/tools.ts) that accept a manager instance (e.g., mandrakeManager.tools or workspaceManagers.get(id).tools). Use these for both system and workspace routes where managers overlap (e.g., ToolsManager, ModelsManager).
* Streaming: For SessionCoordinator endpoints, leverage Hono’s ReadableStream support (see Hono Streaming Docs). Check the SessionCoordinator interface for streaming-related functionality.
* Error Handling: Plan for common errors:
  * 404 Not Found: Invalid workspace ID or resource.
  * 400 Bad Request: Malformed request payloads.
  * Format: { error: string }

## Route Implementation Files

* src/routes/system.ts: Mount system-level routes using mandrakeManager from src/managers.ts.
* src/routes/workspaces.ts: Mount workspace-level routes, retrieving WorkspaceManager from workspaceManagers map.
* Reusable Files:
  * src/routes/tools.ts: For ToolsManager (JSON config management).
  * src/routes/mcp.ts: For MCPManager (server and tool operations).
  * src/routes/models.ts: For ModelsManager.
  * src/routes/config.ts: For MandrakeConfigManager and WorkspaceConfigManager.
  * src/routes/prompt.ts: For PromptManager.
  * src/routes/files.ts: For FilesManager.
  * src/routes/dynamic.ts: For DynamicContextManager.
  * src/routes/sessions.ts: For SessionManager and SessionCoordinator.

## Your Route Plan

For each section above, document your proposed routes here after analyzing the managers. Include:

* Path: e.g., /system/tools/list
* Method: GET, POST, etc.
* Request: Expected payload (if any), e.g., JSON schema (based on manager’s input needs).
* Response: Status code and format, e.g., 200 OK, JSON or streaming (based on manager’s output).
* Rationale: Why this route makes sense given the manager’s interface.

### Example Plan (Tools Configuration Management)

* Path: /system/tools/list
* Method: GET
* Request: None
* Response: 200 OK, JSON: Array of tool configs
* Rationale: ToolsManager manages JSON configs; a list operation aligns with typical config retrieval.
* Path: /system/tools/add
* Method: POST
* Request: JSON: Tool config object
* Response: 201 Created, JSON: { success: true }
* Rationale: Adding a tool config to the JSON file is a core configuration task.

### Example Plan (MCP Server and Tool Operations)

* Path: /system/mcp/tools
* Method: GET
* Request: None
* Response: 200 OK, JSON: Array of tools from running servers
* Rationale: MCPManager handles server operations; listing tools reflects its role in managing active servers.
* Path: /system/mcp/invoke
* Method: POST
* Request: JSON: { serverId: string, toolName: string, params: any }
* Response: 200 OK, JSON: Tool execution result
* Rationale: Invoking a tool on a running server is a key operational feature of MCPManager.

## Integration with Frontend

* Next.js Compatibility: Ensure responses (JSON or text/event-stream) work with Next.js fetch APIs, based on what each manager returns.
* Streaming: Plan for frontend handling of streaming endpoints (e.g., session messages) using ReadableStream, if supported by SessionCoordinator.
* Testing: Refer to docs/TESTING.md for integration test guidance to validate your routes.

## Next Steps

1. Start with a simple manager (e.g., ToolsManager) and draft its routes based on its interface.
1. Implement and test these routes using real objects (per docs/TESTING.md).
1. Expand to other managers, refining your plan as you explore their capabilities.
1. Update this document with your final route specifications.

This approach ensures your API routes are grounded in the actual functionality of Mandrake’s managers, avoiding assumptions and enabling a tailored, effective implementation.
