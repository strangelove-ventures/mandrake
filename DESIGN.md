# Mandrake Design Document

## Overview

Mandrake is an extensible AI agent platform designed for developers, enabling context-aware LLM interactions within isolated workspaces. It provides a structured environment for AI-assisted coding, project management, and technical discussions with persistent context and powerful tool integrations.

## Core Concepts

### Workspace

A workspace is an isolated project environment containing:

- Configuration for tools, models, and prompts
- Source code and context files
- Session history and metadata
- Dynamic context providers

### Session

A conversation within a workspace, consisting of:

- Rounds: User request and AI response pairs
- Turns: Parts of a response, often including tool calls
- Context: Combination of files, history, and dynamic data
- Token usage and cost tracking

### Tools

External capabilities exposed via the Model Context Protocol (MCP):

- Filesystem operations (read, write, edit files)
- Command execution (git, npm, etc.)
- Web requests and data processing
- Custom domain-specific tools

### Dynamic Context

Auto-refreshing information that keeps the LLM updated:

- Project structure (directory tree)
- Git status and branch information
- Database schema and API documentation
- Live data from external services

## Architecture

Mandrake follows a modular architecture with clear component boundaries:

```sh
┌─────────────────────────────────────────────────┐
│                  Web Interface                  │
└───────────────────────┬─────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────┐
│                Session Coordinator              │
│                                                 │
│  ┌─────────────┐   ┌──────────┐   ┌──────────┐  │
│  │  Context    │   │  Tool    │   │  Message │  │
│  │  Builder    │◄──┤  Caller  │◄──┤  Handler │  │
│  └─────────────┘   └──────────┘   └──────────┘  │
└───────┬─────────────────┬─────────────┬─────────┘
        │                 │             │
┌───────▼────────┐ ┌─────▼──────┐ ┌────▼─────────┐
│   Workspace    │ │    MCP     │ │   Provider   │
│    Manager     │ │   Manager  │ │    Manager   │
└───────┬────────┘ └─────┬──────┘ └──────┬───────┘
        │                │              │
┌───────▼────────┐ ┌─────▼──────┐ ┌─────▼───────┐
│  File System   │ │MCP Servers │ │LLM Providers│
│  ~/.mandrake/  │ │(filesystem,│ │ (Claude,    │
│                │ │   fetch)   │ │  Ollama)    │
└────────────────┘ └────────────┘ └─────────────┘
```

## Component Relationships

### Workspace Manager

- Provides access to workspace configuration and state
- Manages sub-managers for tools, models, files, etc.
- Handles persistence of workspace data
- Integrates with session storage via SQLite/Drizzle

### MCP Manager

- Manages lifecycle of tool servers (start/stop)
- Provides unified interface for tool discovery and invocation
- Handles communication via standard I/O or server-sent events
- Buffers and manages server logs

### Provider Manager

- Creates and configures LLM provider instances
- Standardizes message format across providers
- Tracks token usage and calculates costs
- Handles streaming responses and error conditions

### Session Coordinator

- Orchestrates the conversation flow
- Builds context from workspace components
- Detects and executes tool calls
- Manages conversation history
- Coordinates between MCP and provider layers

## Data Flow

1. **User Request**
   - Web interface captures user input
   - Session coordinator processes the request

2. **Context Building**
   - System prompt generated from workspace configuration
   - Files content included from workspace
   - Dynamic context executed and included
   - Conversation history retrieved

3. **LLM Interaction**
   - Provider sends context and request to LLM
   - Streaming response begins
   - Tool calls detected in response

4. **Tool Execution**
   - MCP manager routes tool calls to appropriate servers
   - Tool results returned to session coordinator
   - Response continues with tool results included

5. **Session Storage**
   - Request, response, and turns saved to database
   - Token usage and costs recorded
   - Session history updated

## File Structure

```sh
~/.mandrake/
├── mandrake.db         # Application-level database
├── mandrake.json       # Global configuration
├── tools.json          # Global tool configuration
├── models.json         # Global model configuration
└── workspaces/         # Individual workspaces
    └── my-project/     # A workspace
        ├── .ws/        # Workspace metadata
        │   ├── config/
        │   │   ├── dynamic.json    # Dynamic context config
        │   │   ├── models.json     # Model provider config
        │   │   ├── prompt.json     # System prompt config
        │   │   └── tools.json      # Tool server config
        │   ├── files/              # Context files
        │   ├── session.db          # Conversation database
        │   └── mcpdata/            # Tool server data
        ├── src/                    # Source code (often git repo)
        └── workspace.json          # Workspace metadata
```

## Integration Points

### Web Application ↔ Backend Services

- REST API routes in Next.js connect to workspace and session managers
- API structure mirrors workspace organization for intuitive access
- WebSocket connections for streaming responses

### Session Coordinator ↔ Workspace Manager

- Workspace provides configuration for session initialization
- Session coordinator reads files, dynamic context, and history
- Session data persisted through workspace's session manager

### Session Coordinator ↔ MCP Manager

- Tool configurations retrieved from workspace
- Tool calls routed through MCP manager to appropriate servers
- Tool results formatted and included in responses

### Session Coordinator ↔ Provider Manager

- Model configuration retrieved from workspace
- Provider instances created and managed per session
- Message formatting and streaming handled by provider

### MCP Manager ↔ Tool Servers

- MCP manager starts and monitors tool servers
- Communication via standard I/O or server-sent events
- Tool discovery and invocation standardized through MCP protocol

## Security and Isolation

- Workspaces isolated with separate configuration and storage
- Tool servers run with explicit allowed directories
- Exclude patterns prevent access to sensitive files
- Command execution has security checks and safe patterns

## Extension Points

1. **Custom Tools**
   - Implement new MCP-compatible tool servers
   - Register tools with workspace configuration

2. **New Providers**
   - Extend BaseProvider for additional LLM services
   - Add provider to factory and configuration

3. **Dynamic Context Providers**
   - Create specialized tool implementations
   - Register as dynamic context in workspace

4. **Prompt Templates**
   - Customize system prompt for specialized use cases
   - Add new prompt sections for additional context

## Future Enhancements

- Docker-based tool isolation
- Multi-workspace sessions
- Collaborative editing and sessions
- Fine-tuning and model customization
- Enhanced web interface with IDE integration
