# MCP Inspector Integration Plan

This document outlines the plan for integrating the MCP Inspector code into the Mandrake MCP implementation. The goal is to replace our current implementation with the more robust implementation from the MCP Inspector project.

## Current Architecture

The Mandrake MCP implementation currently consists of:

1. **MCP Manager**: Central service responsible for managing MCP servers
2. **MCP Server Implementation**: Wraps the MCP SDK client to provide server capabilities
3. **Transport Layer**: Simple factory for creating appropriate transports (SSE, STDIO)
4. **Web Components**: React components for interacting with MCP servers
5. **API Client**: Connects the web UI to the backend MCP services
6. **Zustand Store**: Manages MCP state in the frontend

## Inspector Architecture

The MCP Inspector consists of:

1. **Proxy Server**: Bidirectional proxy between client and MCP servers
2. **React Hooks**: Comprehensive hooks for connection management and completions
3. **Transport Handling**: Robust implementation with better error handling and authentication
4. **Client Components**: UI components for interacting with MCP servers

## High-Level Integration Plan

We will adopt a phased approach to integrate the Inspector code:

### Phase 1: Core Infrastructure Update

1. **Add MCPProxy Component**
   - Port the `mcpProxy.ts` implementation for bidirectional communication
   - Enhance our transport layer with better error handling
   - Implement proper session tracking for connections

2. **Update Server Implementation**
   - Enhance the MCPServerImpl with better lifecycle management
   - Improve error handling for disconnections and retries
   - Add support for authentication in SSE transport

3. **SDK Adapters**
   - Create adapter interfaces to decouple from direct SDK dependencies
   - Ensure consistent use of adapters throughout the codebase
   - Test adapters with real SDK implementations

### Phase 2: Client API Enhancement

1. **Update API Endpoints**
   - Ensure our API endpoints can properly communicate with the enhanced MCP implementation
   - Add any missing endpoints needed for new functionality (like completions)
   - Improve error handling and status reporting

2. **React Hooks Implementation**
   - Port the `useConnection` hook for better client-side connection management
   - Implement the `useCompletionState` hook for completions support with debouncing
   - Ensure hooks are compatible with our existing state management

### Phase 3: UI Component Update

1. **Update Tool Components**
   - Update the web components to use the new hooks
   - Enhance the UI to show more detailed server status
   - Improve error handling and user feedback

2. **Add New Functionality**
   - Add completion support for tool arguments
   - Enhance the method execution panel with better feedback
   - Implement real-time log viewing

### Testing Approach

Each phase will include its own testing approach, focusing on integration with real MCP servers:

**Phase 1 Testing**

- Integration tests with actual MCP servers (ripper, function-server, etc.)
- Testing connection lifecycle management
- Testing error handling with various failure scenarios
- Testing authentication with real servers

**Phase 2 Testing**

- Testing API endpoints with real server responses
- Testing completions functionality with supporting servers
- Testing error handling and recovery
- Performance testing of status polling

**Phase 3 Testing**

- Testing UI components with real server data
- Testing user interactions and error feedback
- End-to-end testing of complete workflows
- Performance testing with large numbers of servers

### Documentation

- Update the MCP documentation with new features
- Provide migration guidelines
- Document known limitations and workarounds
- Create examples for common use cases

## Detailed Implementation Plans

The following sections provide detailed implementation plans for each phase. Each phase includes its own testing approach focused on integration testing with real MCP servers.

## Key Areas for Enhancement

Based on our analysis, here are the key areas where the Inspector implementation offers improvements:

1. **Proxy Pattern**
   - The Inspector's `mcpProxy.ts` provides a clean bidirectional communication pattern
   - Better error handling for both client and server sides
   - Proper connection lifecycle management

2. **Transport Layer**
   - More robust SSE implementation with header handling
   - Better error handling for transport issues
   - Support for authentication tokens

3. **Client Hooks**
   - Well-structured hooks for connection management
   - Completion support with debouncing
   - Better notification handling

4. **Error Handling**
   - More comprehensive error handling throughout
   - Better feedback to the user
   - Proper cleanup on errors

5. **Authentication**
   - Support for Bearer tokens in SSE transport
   - OAuth integration

6. **Session Management**
   - Better tracking of active sessions
   - Proper cleanup on session end

## Impact Assessment

The following systems will be impacted by this update:

1. **MCP Package**
   - Server implementation will be enhanced
   - Proxy pattern will be added
   - Transport handling will be improved

2. **Web UI**
   - Hooks will be updated to use new functionality
   - UI components will be enhanced
   - State management will need to be updated

3. **API Layer**
   - New endpoints may be needed
   - Existing endpoints will need to be updated

4. **Workspace Integration**
   - Any workspace-specific MCP functionality will need to be updated

## Migration Strategy

To minimize disruption, we'll follow this migration strategy:

1. Implement the changes in a new branch
2. Create a compatibility layer to ensure existing code works
3. Update the API endpoints to support both old and new patterns
4. Update the UI components incrementally
5. Integration testing with real MCP servers before merging

Each implementation will include pointers to the specific files in the inspector code that we're adapting, making it easier to reference the original implementation during development.

## Conclusion

Integrating the MCP Inspector code will provide significant improvements to our MCP implementation, including:

- More robust connection handling
- Better error handling and user feedback
- Support for completions and other advanced features
- Improved authentication

This integration should be approached methodically to ensure compatibility and minimize disruption to existing functionality.
