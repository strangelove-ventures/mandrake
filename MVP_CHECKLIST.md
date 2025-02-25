# Mandrake MVP Checklist

This checklist tracks progress toward the Minimum Viable Product (MVP) for Mandrake, organized by major system components.

## Core Infrastructure

- [x] Project setup as monorepo with Bun
- [x] Package structure and dependencies
- [x] TypeScript configuration
- [x] Testing framework

## Workspace Management

- [x] Basic workspace file structure
- [x] Configuration file management
- [x] Workspace initialization
- [x] File operations API
- [ ] Workspace backup/restore
- [ ] Finalize folder structure to encapsulate workspace data in .ws folder
- [ ] Support creation of workspaces outside of the default directory with tracking in ~/.mandrake/mandrake.json

## Session Management

- [x] SQLite/Drizzle ORM integration
- [x] Session data model (rounds, turns)
- [x] Session creation and retrieval
- [x] Conversation history tracking
- [ ] Enhanced search/filtering
- [ ] Session tagging and organization
- [ ] Token usage and cost tracking

## Provider Integration

- [x] Base provider abstraction
- [x] Anthropic provider implementation
- [x] Ollama provider implementation
- [x] Token counting and cost calculation
- [x] Streaming response handling
- [ ] Provider-specific configuration UI
- [ ] Multi-model conversations
- [ ] Many more provider implementations

## Tool Infrastructure

- [x] MCP server management
- [x] Tool discovery mechanism
- [x] Tool invocation flow
- [x] Transport implementations (stdio)
- [ ] Docker-based server isolation (future)
- [ ] Tool authorization flow

## Ripper (Filesystem Tool)

- [x] Basic file operations (read/write)
- [x] Directory operations
- [x] File editing capabilities
- [x] Command execution
- [x] Security boundaries
- [ ] Enhanced permissions model

## Workspace Tools

- [ ] A mcp server to expose workspace level functionality to llm
- [ ] Basic operations in a .ws/ folder
- [ ] Secret management
- [ ] Session database search and summary
- [ ] Filesystem operations in the workspace

## Dynamic Context

- [x] Dynamic context configuration
- [x] Context refresh mechanism
- [x] Context insertion into prompts
- [ ] UI for context management

## Web Application

- [x] Next.js project setup
- [x] Backend Services
- [ ] Backend Services tests
- [ ] API routes for backend services
- [ ] Tests for API routes
- [ ] Workspace management UI
- [ ] Session interface
- [ ] Tool configuration UI
- [ ] Model configuration UI
- [ ] Context file management UI

## Documentation

- [x] Package READMEs
- [x] Architecture design document
- [x] API documentation
- [ ] User guide
- [ ] Configuration guide
- [ ] Example workflows

## DevOps

- [ ] CI/CD pipeline
- [ ] Release process
- [ ] Installer creation
- [ ] Update mechanism
- [ ] Telemetry (opt-in)

## MVP Feature Status

- **Core Packages**: 90% complete
- **Web Interface**: 20% complete
- **Documentation**: 70% complete
- **DevOps**: 10% complete