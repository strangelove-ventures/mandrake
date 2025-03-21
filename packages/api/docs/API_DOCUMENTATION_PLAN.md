# Mandrake API Documentation & Cleanup Plan

This document outlines a comprehensive plan for documenting and cleaning up the Mandrake API package. The goal is to create clear documentation of the services architecture, API routes, request/response patterns, and establish consistent patterns for future development.

## 1. Services Architecture

### Service Initialization & Lifecycle

- Document how managers are initialized during API startup
- Map dependency relationships between managers
- Document lifecycle management (startup/shutdown hooks)
- Detail configuration loading and validation

### Core Services Documentation

- **MCPManager**
  - Tool server management
  - Health monitoring
  - Server lifecycle
  - Tool invocation handling

- **WorkspaceManager**
  - Workspace configuration & operations
  - File operations
  - Resource management
  - Configuration persistence

- **MandrakeManager**
  - System-wide configuration
  - Workspace registry management
  - System-level resources

- **SessionCoordinator**
  - Session creation and management
  - Streaming implementation
  - Message handling
  - History management

## 2. API Routes Structure

### Route Organization

- System vs. workspace routes
- Resource grouping principles
- Error handling patterns
- Route naming conventions

### Route-to-Service Mapping

- How routes access appropriate service instances
- Context passing & middleware structure
- Workspace context injection
- Service state synchronization

## 3. Request/Response Patterns

### Data Flow

- Request validation patterns
- Service method invocation patterns
- Response formatting standards
- Error handling and propagation

### Authentication & Authorization
- Current implementation (if any)
- Security boundaries
- Best practices for future implementation

## 4. API Documentation Enhancement

### OpenAPI/Swagger Integration
- Route documentation
- Request/response schema documentation
- Example generation
- Interactive API testing

### Developer Documentation
- How to extend the API
- Testing approach
- Common patterns to follow
- Best practices for route implementation

## 5. Cleanup Tasks

### Code Consistency
- Error handling standardization
- Logging standardization
- Type definition cleanup
- Response format standardization

### Middleware Optimization
- Reduce code duplication
- Improve error propagation
- Standardize context injection
- Centralized validation

## 6. Testing Strategy

### Test Coverage Analysis
- Current coverage assessment
- Gap identification
- Priority areas for improvement
- Integration test planning

### Test Pattern Standardization
- Setup/teardown patterns
- Test data management
- Integration test approach
- Performance testing considerations

## Implementation Timeline

1. **Phase 1: Documentation & Analysis (2 weeks)**
   - Document existing services and routes
   - Analyze current patterns and inconsistencies
   - Create detailed documentation for each major service

2. **Phase 2: Cleanup & Standardization (2-3 weeks)**
   - Implement standardized error handling
   - Clean up route implementations
   - Improve middleware consistency
   - Enhance type definitions

3. **Phase 3: Testing Enhancement (2 weeks)**
   - Improve test coverage
   - Standardize test patterns
   - Add integration tests for critical paths

4. **Phase 4: API Documentation (1-2 weeks)**
   - Implement OpenAPI/Swagger
   - Create developer documentation
   - Document extension patterns

## Next Steps

- Create detailed documentation plans for each core service
- Prioritize cleanup tasks based on impact and effort
- Establish coding standards for API routes
- Begin documentation of high-priority services