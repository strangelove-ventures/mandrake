# Mandrake API

The API package serves as the core server component for the Mandrake project, providing RESTful endpoints for all functionality. Built with [Hono](https://hono.dev/), it's designed to work seamlessly with the Next.js frontend while maintaining a clean separation of concerns.

## Architecture

The API follows a layered architecture with three main components:

### 1. Service Registry

The Service Registry is the foundation of the API, providing:

- Centralized management of service lifecycles
- Dependency-aware initialization and cleanup
- Lazy loading of services via factories
- Workspace isolation with per-workspace service instances
- Type-safe access to specialized managers

```typescript
// Example: Getting a type-safe manager
const mcpManager = await serviceRegistry.getMCPManager(workspaceId);
await mcpManager.startServer('some-server', config);
```

### 2. Adapters

Adapters wrap core manager implementations from other packages to provide a consistent interface to the Service Registry:

- `MandrakeManagerAdapter`: System-wide configuration and workspace management
- `MCPManagerAdapter`: Tool server management and execution
- `WorkspaceManagerAdapter`: Workspace-specific operations
- `SessionCoordinatorAdapter`: Session management and LLM interactions

Each adapter implements the `ManagedService` interface, making service lifecycle management consistent.

### 3. Routes

Routes expose the functionality as HTTP endpoints, following a consistent pattern:

- System-level routes (`/system/*`): Global operations
- Workspace-level routes (`/workspaces/:id/*`): Workspace-specific operations

Routes use middleware to access managers through the Service Registry.

## API Routes

### System-Level Routes
- **GET /system** - System information
- **GET|PUT /system/config** - Mandrake configuration
- **GET|POST|PUT|DELETE /system/tools** - Tools configuration
- **GET|POST /system/mcp** - MCP server operations
- **GET|POST|PUT|DELETE /system/models** - Models management
- **GET|PUT /system/prompt** - Prompt configuration
- **GET|POST|PUT|DELETE /system/dynamic** - Dynamic context
- **GET|POST|PUT|DELETE /system/sessions** - Session management

### Workspace-Level Routes
- **GET /workspaces/list** - List workspaces
- **POST /workspaces/create** - Create workspace
- **GET|DELETE /workspaces/:id** - Workspace info/management
- **GET|PUT /workspaces/:id/config** - Workspace configuration
- **GET|POST|PUT|DELETE /workspaces/:id/tools** - Tools configuration
- **GET|POST /workspaces/:id/mcp** - MCP server operations
- **GET|POST|PUT|DELETE /workspaces/:id/models** - Models management
- **GET|PUT /workspaces/:id/prompt** - Prompt configuration
- **GET|POST|PUT|DELETE /workspaces/:id/files** - Files management
- **GET|POST|PUT|DELETE /workspaces/:id/dynamic** - Dynamic context
- **GET|POST|PUT|DELETE /workspaces/:id/sessions** - Session management

## Usage

### Basic Server Setup

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createManagers } from './managers';
import { mountAllRoutes } from './routes';

const app = new Hono();
app.use(cors());

// Initialize managers and mount routes
const { managers, serviceRegistry } = await createManagers();
mountAllRoutes(app, managers);

// Start the server
export default {
  port: 3001,
  fetch: app.fetch
};
```

### Accessing Services

The Service Registry provides type-safe access to all services:

```typescript
// Global services
const mandrakeManager = await serviceRegistry.getMandrakeManager();
const systemMCPManager = await serviceRegistry.getMCPManager();
const systemSessionCoordinator = await serviceRegistry.getSessionCoordinator();

// Workspace services
const workspaceManager = await serviceRegistry.getWorkspaceManager(workspaceId);
const workspaceMCPManager = await serviceRegistry.getMCPManager(workspaceId);
const workspaceSessionCoordinator = await serviceRegistry.getSessionCoordinator(workspaceId);
```

## Development

### Commands
- Start development server: `bun dev`
- Run tests: `bun test`
- Build for production: `bun run build`
- Clean: `bun run clean`

### Environment Variables
- `PORT`: Server port (default: 3001)
- `HOST`: Server host (default: localhost)
- `MANDRAKE_HOME`: Path to Mandrake data directory

### Testing

The API has comprehensive tests for all routes and services:

```bash
# Run all tests
bun test

# Run specific test files
bun test tests/routes/config.test.ts

# Run tests matching a pattern
bun test --test-name-pattern "should create"
```

## Roadmap

- ✅ Core service registry with dependency management
- ✅ Complete route implementation with manager integration
- ✅ Streaming support for session responses
- ✅ Workspace isolation
- 🔄 API documentation and OpenAPI schema
- ⏳ Authentication and authorization
- ⏳ Rate limiting and usage metrics