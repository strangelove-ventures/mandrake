# Manager Initialization and Lifecycle Management

This document details the initialization and lifecycle management of key managers used in the packages/api package. It provides references to their implementations in the workspace, mcp, and session packages, offering implementors a clear path to understand each object’s purpose, configuration, and behavior. These managers are central to exposing Mandrake’s functionality through the API, managing both system-level and workspace-level operations.

## Overview

The API package relies on several managers to handle configuration, tool execution, and session orchestration. These are initialized in packages/api/src/managers.ts and persist across requests to ensure efficient operation. The managers are categorized into singletons (system-wide) and map-based instances (workspace-specific or session-specific), with each tied to specific implementations in the Mandrake codebase.

## Manager Details

### 1. MandrakeManager (Singleton)

* *Purpose*: Manages system-level configuration and state for the entire Mandrake application, serving as the top-level coordinator for global settings, tools, models, and sessions.
* *Initialization*: Created as a singleton at API startup, persisting for the application lifetime. It uses a fixed path (e.g., `~/.mandrake`) to load and store system-wide configurations.
* *Lifecycle*: Initialized once and remains active, managing its own state persistence (e.g., JSON files for configs, SQLite for sessions).
* Implementation Reference:
  * File: packages/workspace/src/index.ts
  * Class: MandrakeManager
  * Key Details:
    * Constructor takes a rootPath parameter (see line ~50).
    * Exports managers like tools, models, prompt, and sessions (see exports around line ~100).
    * Uses MandrakePaths for path management (defined in packages/workspace/src/utils/paths.ts).
* Usage in API: Provides system-level managers for routes under /system, e.g., mandrakeManager.tools for /system/tools.

### 2. WorkspaceManager (Map-Based)

* *Purpose*: Manages individual workspace configurations and state, encapsulating tools, models, prompts, files, dynamic context, and sessions for a specific project.
* *Initialization*: Stored in a Map<string, WorkspaceManager> keyed by workspace ID. Initialized by scanning the workspaces directory (e.g., `~/.mandrake/workspaces`) at startup, loading existing workspaces into memory.
* *Lifecycle*: Persists across requests, with each instance managing its own state (e.g., JSON files in .ws/config/, SQLite in .ws/session.db). New workspaces can be added dynamically via API routes.
* Implementation Reference:
  * File: packages/workspace/src/index.ts
  * Class: WorkspaceManager
  * Key Details:
    * Constructor takes rootPath and name parameters (see line ~150).
    * Initializes sub-managers like tools (ToolsManager), models (ModelsManager), etc. (see *initialization* block around line ~200).
    * init method sets up the workspace (see line ~250).
  * Sub-Managers:
    * ToolsManager: packages/workspace/src/managers/tools.ts
    * ModelsManager: packages/workspace/src/managers/models.ts
    * PromptManager: packages/workspace/src/managers/prompt.ts
    * DynamicContextManager: packages/workspace/src/managers/dynamic.ts
    * FilesManager: packages/workspace/src/managers/files.ts
    * SessionManager: packages/workspace/src/managers/session.ts
    * WorkspaceConfigManager: packages/workspace/src/managers/workspaceConfig.ts
* Usage in API: Provides workspace-specific managers for routes under /workspaces/:workspaceId, e.g., workspaceManagers.get(id).tools for /workspaces/:id/tools.

### 3. MCPManager (Singleton and Map-Based)

* *Purpose*: Manages Model Context Protocol (MCP) servers for tool execution, handling server *lifecycle*, tool discovery, and invocation. Exists as a singleton for system-level tools and per-workspace instances for workspace-specific tools.
* *Initialization*: System-Level: A singleton MCPManager for system-wide tools, initialized at startup.
Workspace-Level: A Map<string, MCPManager> keyed by workspace ID, initialized alongside WorkspaceManager instances during the workspace scan.
* *Lifecycle*: Persists across requests, with each instance managing MCP server processes (e.g., starting/stopping servers like ripper). State is managed internally (e.g., logs in LogBuffer).
* Implementation Reference:
  * File: packages/mcp/src/manager.ts
  * Class: MCPManager
  * Key Details:
    * Constructor initializes an empty servers map (see line ~20).
    * startServer method launches an MCP server (see line ~40).
    * listAllTools and invokeTool methods handle tool operations (see lines ~100-150).
  * Supporting Classes:
    * MCPServerImpl: packages/mcp/src/server.ts (implements server *lifecycle* and tool calls).
    * LogBuffer: packages/mcp/src/logger.ts (manages server logs).
    * TransportFactory: packages/mcp/src/transport/index.ts (creates stdio/SSE transports).
* Usage in API: Used for tool-related routes, e.g., /system/tools/list (system-level) or /workspaces/:id/tools/list (workspace-level), via mcpManagers.get(id).

### 4. SessionCoordinator (Singleton and Map-Based)

* *Purpose*: Orchestrates conversation flow, builds context, executes tool calls, and streams LLM responses. Exists at both system and workspace levels, managing active sessions.
* *Initialization*: System-Level: A Map<string, SessionCoordinator> for system-wide sessions, keyed by session ID.
Workspace-Level: A nested Map<string, Map<string, SessionCoordinator>>, with the outer key as workspace ID and inner key as session ID, initialized per workspace.
* *Lifecycle*: Persists across requests, created when a session starts (e.g., via POST /sessions/create) and removed when the session ends or times out. Relies on SessionManager for persistent storage.
* Implementation Reference:
  * File: packages/session/src/coordinator.ts
  * Class: SessionCoordinator
  * Key Details:
    * Constructor takes multiple managers (e.g., sessionManager, mcpManager, modelsManager) and metadata (see line ~30).
    * handleRequest method processes user requests and returns responses (see line ~100).
    * processMessage method (not explicitly shown but implied) would handle streaming, integrating with ProviderManager and MCPManager.
  * Supporting Components:
    * SessionManager: packages/workspace/src/managers/session.ts (persists session data to SQLite).
    * PromptBuilder: packages/session/src/prompt/builder.ts (constructs context for LLM calls).
    * ProviderManager: packages/provider/src/factory.ts (manages LLM providers like Anthropic, Ollama).
* Usage in API: Powers streaming endpoints like /workspaces/:workspaceId/sessions/:sessionId/messages, retrieving instances from sessionCoordinators.get(workspaceId).get(sessionId).

### Initialization Workflow

1. Startup:

* Instantiate MandrakeManager with a fixed path (e.g., ~/.mandrake).
* Scan the workspaces directory to populate workspaceManagers, mcpManagers, and sessionCoordinators maps.
* Initialize a system-level MCPManager and empty sessionCoordinators map for system sessions.

1. Dynamic Updates:

* Add new WorkspaceManager instances via POST /workspaces routes, updating all related maps.
* Create SessionCoordinator instances via POST /sessions/create, storing them in the appropriate map.

1. Access:

* Routes access managers via exported functions in src/managers.ts, e.g., getWorkspaceManager(id) or getSessionCoordinator(workspaceId, sessionId).

### Lifecycle Management

* Persistence: Each manager handles its own state persistence (e.g., JSON files, SQLite), so the API only needs to maintain in-memory references.
* Cleanup:
  * MCP servers are stopped via MCPManager.cleanup() on API shutdown or workspace deletion.
  * Session coordinators are removed from maps when sessions complete or time out (TBD: implement timeout logic).
* Error Handling: Log failures using @mandrake/utils logger (see packages/utils/src/index.ts), ensuring robustness.

### Integration with Routes

* System Routes: Use mandrakeManager.<manager> directly (e.g., mandrakeManager.tools for /system/tools).
* Workspace Routes: Retrieve from maps using workspaceId (e.g., workspaceManagers.get(id).tools for /workspaces/:id/tools).
* Session Routes: Access coordinators via sessionCoordinators.get(workspaceId)?.get(sessionId) for streaming responses.

### Additional Notes

* Dependencies: Ensure all referenced packages (@mandrake/workspace, @mandrake/mcp, @mandrake/session, @mandrake/utils, @mandrake/provider) are included in package.json.
* Scalability: The map-based approach scales well for multiple workspaces and sessions, though memory usage should be monitored for large deployments.
* Documentation: Refer to individual package READMEs (e.g., packages/workspace/README.md) for deeper implementation details.

This guide equips implementors with a clear understanding of each manager’s source and role, facilitating efficient development of the API package.
