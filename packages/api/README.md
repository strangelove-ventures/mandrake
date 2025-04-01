# Mandrake API

The API package serves as the core server component for the Mandrake project, providing RESTful endpoints for all functionality. Built with [Hono](https://hono.dev/), it's designed to work seamlessly with the Next.js frontend while maintaining a clean separation of concerns.

## Documentation

Full API documentation is available in the following formats:

- **OpenAPI Specification**: [View the full OpenAPI spec](./docs/openapi.yaml) - [Using the OpenAPI Spec](./docs/OPENAPI.md)
- **Service Registry Documentation**: [Learn about the Service Registry](./src/services/registry/README.md)
- **Service Adapters Documentation**: [Learn about Service Adapters](./src/services/registry/adapters/README.md)
- **Client Integration Guide**: [Integrating with the API from clients](./docs/CLIENT_INTEGRATION_GUIDE.md)
- **Extending the API**: [Guide for adding new routes and services](./docs/EXTENDING_THE_API.md)

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

## API Endpoints

Mandrake API is organized into system-level and workspace-level endpoints. Below is a high-level overview of available endpoints. For detailed request/response formats, parameters, and examples, please refer to the [OpenAPI specification](./docs/openapi.yaml).

### System-Level Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/system` | Get system information and health status |
| GET | `/system/config` | Get system configuration |
| PUT | `/system/config` | Update system configuration |
| GET | `/system/tools/operations` | List available tool operations |
| GET | `/system/tools/configs` | List tool configurations |
| POST | `/system/tools/configs` | Create a new tool configuration |
| GET | `/system/tools/configs/:configId` | Get a specific tool configuration |
| PUT | `/system/tools/active` | Update the active tool configuration |
| GET | `/system/models` | List available models |
| GET | `/system/models/active` | Get the active model |
| PUT | `/system/models/active` | Update the active model |
| GET | `/system/prompt` | Get prompt configuration |
| PUT | `/system/prompt` | Update prompt configuration |
| GET | `/system/sessions` | List all sessions |
| POST | `/system/sessions` | Create a new session |
| GET | `/system/sessions/:sessionId` | Get a specific session |
| DELETE | `/system/sessions/:sessionId` | Delete a session |
| GET | `/system/sessions/:sessionId/history` | Get session message history |
| POST | `/system/sessions/:sessionId/stream` | Stream a conversation with the LLM |

### Workspace-Level Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/workspaces` | List all workspaces |
| POST | `/workspaces` | Create a new workspace |
| GET | `/workspaces/:workspaceId` | Get a specific workspace |
| DELETE | `/workspaces/:workspaceId` | Delete a workspace |
| GET | `/workspaces/:workspaceId/config` | Get workspace configuration |
| PUT | `/workspaces/:workspaceId/config` | Update workspace configuration |
| GET | `/workspaces/:workspaceId/tools/operations` | List workspace tool operations |
| GET | `/workspaces/:workspaceId/tools/configs` | List workspace tool configurations |
| POST | `/workspaces/:workspaceId/tools/configs` | Create a workspace tool configuration |
| GET | `/workspaces/:workspaceId/models` | List workspace models |
| GET | `/workspaces/:workspaceId/prompt` | Get workspace prompt configuration |
| PUT | `/workspaces/:workspaceId/prompt` | Update workspace prompt configuration |
| GET | `/workspaces/:workspaceId/files` | List workspace files |
| POST | `/workspaces/:workspaceId/files` | Create a new file in the workspace |
| GET | `/workspaces/:workspaceId/dynamic` | List dynamic context methods |
| POST | `/workspaces/:workspaceId/dynamic` | Create a new dynamic context method |
| GET | `/workspaces/:workspaceId/sessions` | List workspace sessions |
| POST | `/workspaces/:workspaceId/sessions` | Create a workspace session |
| GET | `/workspaces/:workspaceId/sessions/:sessionId` | Get a workspace session |
| DELETE | `/workspaces/:workspaceId/sessions/:sessionId` | Delete a workspace session |
| GET | `/workspaces/:workspaceId/sessions/:sessionId/history` | Get workspace session history |
| POST | `/workspaces/:workspaceId/sessions/:sessionId/stream` | Stream a workspace conversation |

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
- ✅ API documentation and OpenAPI schema
- ✅ OpenAPI specification validation tests
- ⏳ Authentication and authorization
- ⏳ Rate limiting and usage metrics