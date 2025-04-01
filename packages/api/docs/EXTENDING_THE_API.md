# Extending the Mandrake API

This guide provides information for developers who want to extend the Mandrake API with new routes or enhance existing functionality. It focuses on best practices, patterns to follow, and integration with the service registry.

## Overview

The Mandrake API follows a consistent architecture pattern:

1. **Service Registry**: Central management of services and their dependencies
2. **Service Adapters**: Implementation of the `ManagedService` interface for core services
3. **Routes**: HTTP endpoints that use services to handle requests
4. **Middleware**: Common functionality shared across routes

When extending the API, you should follow these same patterns to ensure consistency and maintainability.

## Adding New Routes

### 1. Determine the Route Category

New routes should be categorized as either:

- **System Routes**: Global operations affecting the entire system
- **Workspace Routes**: Operations specific to a particular workspace

### 2. Create a New Route File

Create a new file in the `src/routes` directory following the existing naming pattern. For example, if adding analytics routes, create `analytics.ts`:

```typescript
import { Hono } from 'hono';
import { ServiceRegistry } from '../services/registry';
import { z } from 'zod'; // For input validation

export function systemAnalyticsRoutes(registry: ServiceRegistry): Hono {
  const router = new Hono();
  
  // GET /analytics
  router.get('/', async (c) => {
    try {
      // Get necessary services from the registry
      const mandrakeManager = await registry.getMandrakeManager();
      
      // Implement route logic
      const analytics = await mandrakeManager.getSystemAnalytics();
      
      // Return response
      return c.json(analytics);
    } catch (error) {
      // Handle errors consistently
      console.error('Error getting system analytics:', error);
      return c.json({ 
        error: 'Failed to retrieve system analytics',
        details: error.message 
      }, 500);
    }
  });
  
  // More routes...
  
  return router;
}

export function workspaceAnalyticsRoutes(registry: ServiceRegistry): Hono {
  const router = new Hono();
  
  // GET /workspaces/:workspaceId/analytics
  router.get('/', async (c) => {
    try {
      const workspaceId = c.req.param('workspaceId');
      
      // Get workspace manager from registry
      const workspaceManager = await registry.getWorkspaceManager(workspaceId);
      
      // Implement route logic
      const analytics = await workspaceManager.getAnalytics();
      
      // Return response
      return c.json(analytics);
    } catch (error) {
      console.error(`Error getting analytics for workspace ${c.req.param('workspaceId')}:`, error);
      return c.json({ 
        error: 'Failed to retrieve workspace analytics',
        details: error.message 
      }, 500);
    }
  });
  
  // More routes...
  
  return router;
}
```

### 3. Mount the Routes

Update the main route mounting code in `src/routes/index.ts` to include your new routes:

```typescript
import { systemAnalyticsRoutes, workspaceAnalyticsRoutes } from './analytics';

// In the mountSystemRoutes function:
app.route('/analytics', systemAnalyticsRoutes(registry));

// In the mountWorkspaceRoutes function:
workspaceRouter.route('/analytics', workspaceAnalyticsRoutes(registry));
```

### 4. Input Validation

Always validate input data using Zod schemas:

```typescript
import { z } from 'zod';

// Define schema for input validation
const analyticsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  metrics: z.array(z.string()).optional()
});

// In your route handler
router.get('/', async (c) => {
  try {
    // Validate query parameters
    const queryParams = c.req.query();
    const validatedParams = analyticsQuerySchema.parse({
      startDate: queryParams.startDate,
      endDate: queryParams.endDate,
      metrics: queryParams.metrics?.split(',')
    });
    
    // Use validated params in your logic
    const analytics = await workspaceManager.getAnalytics(validatedParams);
    
    return c.json(analytics);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Handle validation errors
      return c.json({ 
        error: 'Invalid input parameters',
        details: error.errors 
      }, 400);
    }
    
    // Handle other errors
    return c.json({ 
      error: 'Failed to retrieve analytics',
      details: error.message 
    }, 500);
  }
});
```

## Creating a New Service

If your new functionality requires a new service, you should:

1. Implement the core service functionality
2. Create an adapter that implements the `ManagedService` interface
3. Register the service with the Service Registry

### 1. Implement the Service

First, implement the core service functionality:

```typescript
// src/services/analytics/analytics-manager.ts
export class AnalyticsManager {
  private dbPath: string;
  
  constructor(options: { dbPath: string }) {
    this.dbPath = options.dbPath;
  }
  
  async init(): Promise<void> {
    // Initialize database connection or other resources
  }
  
  async getSystemMetrics(): Promise<any> {
    // Implement metrics gathering logic
  }
  
  async getWorkspaceMetrics(workspaceId: string): Promise<any> {
    // Implement workspace-specific metrics
  }
  
  async close(): Promise<void> {
    // Clean up resources
  }
}
```

### 2. Create a Service Adapter

Create an adapter that implements the `ManagedService` interface:

```typescript
// src/services/registry/adapters/analytics-manager-adapter.ts
import { ManagedService, ServiceStatus } from '../types';
import { AnalyticsManager } from '../../analytics/analytics-manager';
import { Logger, ConsoleLogger } from '@mandrake/utils';

export class AnalyticsManagerAdapter implements ManagedService {
  private initialized = false;
  private logger: Logger;
  
  constructor(
    private readonly manager: AnalyticsManager,
    options?: { logger?: Logger }
  ) {
    this.logger = options?.logger || new ConsoleLogger({
      meta: { service: 'AnalyticsManagerAdapter' }
    });
  }
  
  async init(): Promise<void> {
    if (this.initialized) {
      this.logger.debug('Already initialized');
      return;
    }
    
    try {
      await this.manager.init();
      this.initialized = true;
      this.logger.info('AnalyticsManager initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize AnalyticsManager:', error);
      throw error;
    }
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }
  
  async cleanup(): Promise<void> {
    if (!this.initialized) return;
    
    try {
      await this.manager.close();
      this.initialized = false;
      this.logger.info('AnalyticsManager cleaned up successfully');
    } catch (error) {
      this.logger.error('Error cleaning up AnalyticsManager:', error);
      // We don't throw here to prevent blocking other service cleanup
    }
  }
  
  async getStatus(): Promise<ServiceStatus> {
    return {
      isHealthy: this.initialized,
      message: this.initialized 
        ? 'AnalyticsManager is healthy'
        : 'AnalyticsManager is not initialized',
      statusCode: this.initialized ? 200 : 503,
      details: {
        // Add service-specific status details here
      }
    };
  }
  
  // Expose manager methods through the adapter
  getManager(): AnalyticsManager {
    return this.manager;
  }
}
```

### 3. Register with Service Registry

Update the registry initialization code to include your new service:

```typescript
// In src/index.ts or where you initialize the registry
import { AnalyticsManager } from './services/analytics/analytics-manager';
import { AnalyticsManagerAdapter } from './services/registry/adapters/analytics-manager-adapter';

// Create and register the service
const analyticsManager = new AnalyticsManager({
  dbPath: path.join(home, 'analytics.db')
});

registry.registerService(
  'analytics-manager',
  new AnalyticsManagerAdapter(analyticsManager, {
    logger: logger.child({ service: 'AnalyticsManagerAdapter' })
  }),
  {
    dependencies: ['mandrake-manager'],
    initializationPriority: 20
  }
);

// Add type-safe access method to the registry
// In src/services/registry/index.ts
export interface ServiceRegistry {
  // Add to interface
  getAnalyticsManager(): Promise<AnalyticsManager>;
}

// In the implementation class
async getAnalyticsManager(): Promise<AnalyticsManager> {
  const adapter = await this.getService<AnalyticsManagerAdapter>('analytics-manager');
  if (!adapter) {
    throw new Error('Analytics Manager service not available');
  }
  return adapter.getManager();
}
```

## Updating the OpenAPI Specification

When adding new routes, always update the OpenAPI specification to reflect the changes:

1. Open `docs/openapi.yaml`
2. Add the new endpoints following the existing pattern
3. Define any new schemas needed for request/response bodies
4. Run the OpenAPI validation tests to ensure accuracy

```yaml
# Example addition to openapi.yaml
  /workspaces/{workspaceId}/analytics:
    get:
      summary: Get workspace analytics
      description: Returns analytics data for a specific workspace.
      operationId: getWorkspaceAnalytics
      tags:
        - Workspaces
        - Analytics
      parameters:
        - name: workspaceId
          in: path
          required: true
          description: ID of the workspace
          schema:
            type: string
        - name: startDate
          in: query
          required: false
          description: Start date for analytics (YYYY-MM-DD)
          schema:
            type: string
            format: date
        - name: endDate
          in: query
          required: false
          description: End date for analytics (YYYY-MM-DD)
          schema:
            type: string
            format: date
      responses:
        '200':
          description: Analytics data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AnalyticsData'
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'

# Add new schema
components:
  schemas:
    AnalyticsData:
      type: object
      properties:
        totalSessions:
          type: integer
          description: Total number of sessions
        totalMessages:
          type: integer
          description: Total number of messages
        averageMessagesPerSession:
          type: number
          description: Average messages per session
        toolUsage:
          type: object
          additionalProperties:
            type: integer
          description: Tool usage count by tool name
      required:
        - totalSessions
        - totalMessages
```

## Testing New Routes

### 1. Unit Testing

Create unit tests for your new routes in the `tests/routes` directory:

```typescript
// tests/routes/analytics.test.ts
import { describe, test, expect } from 'bun:test';
import { createMandrakeDirectory } from '../utils';
import { AnalyticsManager } from '../../src/services/analytics/analytics-manager';
import { ServiceRegistryImpl } from '../../src/services/registry';
import { systemAnalyticsRoutes, workspaceAnalyticsRoutes } from '../../src/routes/analytics';
import { Hono } from 'hono';

describe('Analytics Routes', () => {
  // Setup test environment
  let tempDir: string;
  let registry: ServiceRegistryImpl;
  let app: Hono;
  
  beforeEach(async () => {
    // Create temporary test directory
    tempDir = await createMandrakeDirectory('analytics-routes-test');
    
    // Set up registry with mocked services
    registry = new ServiceRegistryImpl();
    
    // Set up test app
    app = new Hono();
    app.route('/system/analytics', systemAnalyticsRoutes(registry));
  });
  
  test('GET /system/analytics returns system analytics', async () => {
    // Mock the necessary services
    registry.getMandrakeManager = async () => ({
      getSystemAnalytics: async () => ({
        totalWorkspaces: 3,
        totalSessions: 10,
        activeUsers: 5
      })
    }) as any;
    
    // Make the request
    const res = await app.request('/system/analytics');
    expect(res.status).toBe(200);
    
    // Verify the response
    const data = await res.json();
    expect(data.totalWorkspaces).toBe(3);
    expect(data.totalSessions).toBe(10);
    expect(data.activeUsers).toBe(5);
  });
  
  // More tests...
});
```

### 2. Integration Testing

Create integration tests that test the route with real services:

```typescript
// tests/integration/analytics.test.ts
import { describe, test, expect } from 'bun:test';
import { createTempDirectory, removeTempDirectory } from '../utils';
import { createApp } from '../../src';
import { waitForInitialization } from '../utils';

describe('Analytics Integration', () => {
  let tempDir: string;
  let app;
  
  beforeEach(async () => {
    tempDir = await createTempDirectory();
    
    // Create real app instance with all services
    app = await createApp({
      home: tempDir,
      port: 0 // Use random port for testing
    });
    
    await waitForInitialization(app);
  });
  
  afterEach(async () => {
    // Clean up
    await app.cleanup();
    await removeTempDirectory(tempDir);
  });
  
  test('Can retrieve system analytics', async () => {
    // Create some test data first
    // ...
    
    // Test the analytics endpoint
    const res = await app.request('/system/analytics');
    expect(res.status).toBe(200);
    
    const data = await res.json();
    expect(data.totalWorkspaces).toBeGreaterThanOrEqual(0);
    expect(data.totalSessions).toBeGreaterThanOrEqual(0);
  });
  
  // More tests...
});
```

## Best Practices

### Error Handling

Use consistent error handling across all routes:

```typescript
try {
  // Route logic
} catch (error) {
  console.error('Error in route handler:', error);
  
  // Determine appropriate status code
  let statusCode = 500;
  if (error.code === 'NOT_FOUND') statusCode = 404;
  if (error.code === 'INVALID_REQUEST') statusCode = 400;
  
  return c.json({
    error: error.message || 'An unexpected error occurred',
    code: error.code || 'INTERNAL_ERROR',
    details: error.details || {}
  }, statusCode);
}
```

### Service Access

Always access services through the registry using the type-safe methods:

```typescript
// Good - type-safe access
const mandrakeManager = await registry.getMandrakeManager();

// Avoid - generic access without type safety
const manager = await registry.getService('mandrake-manager');
```

### Route Organization

- Group related functionality in the same route file
- Use consistent naming patterns
- Separate system and workspace routes
- Keep route handlers concise and focused

### Response Formats

Maintain consistent response formats across all endpoints:

- Use HTTP status codes appropriately
- Include clear error messages
- Structure response data consistently

## Further Reading

- [Service Registry Documentation](../src/services/registry/README.md)
- [Service Adapters Documentation](../src/services/registry/adapters/README.md)
- [OpenAPI Specification](./openapi.yaml)
- [Client Integration Guide](./CLIENT_INTEGRATION_GUIDE.md)