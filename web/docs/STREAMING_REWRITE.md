# WebSocket Streaming Rewrite Implementation Plan

## Summary of Issues

After analyzing the codebase, I've identified several issues that need to be addressed in the frontend implementation of WebSocket streaming:

1. **Multiple Implementations**: There are two separate implementations for WebSocket streaming - `useSessionStream.ts` and `useSessionStreamQuery.ts`, which create confusion.
2. **Type Mismatches**: The message structure in the frontend doesn't match the WebSocket event structure from the backend.
3. **Message Processing Logic**: The current logic for handling streamed messages and tool calls needs refinement.
4. **State Management**: The state management for streaming sessions is inconsistent between components.
5. **Legacy Code**: There are remnants of the old SSE (Server-Sent Events) implementation that need to be removed.

## Implementation Plan

### 1. Consolidate WebSocket Streaming Logic

Create a single, robust implementation for WebSocket streaming that replaces the duplicate hooks.

- **Target Files**:
  - `/web/src/hooks/api/useSessionStream.ts` (primary hook to keep)
  - `/web/src/hooks/api/useSessionStreamQuery.ts` (to be deprecated)

- **Implementation Details**:
  - Consolidate functionality from both hooks into a single, improved hook
  - Remove all SSE and fetch-related code
  - Improve error handling and reconnection logic
  - Ensure proper cleanup of WebSocket connections

### 2. Standardize Message Handling

Update the frontend to properly handle the message format from the WebSocket API.

- **Target Files**:
  - `/web/src/lib/api/core/streaming.ts` (WebSocket connection handler)
  - `/web/src/components/shared/chat/types.ts` (message type definitions)

- **Implementation Details**:
  - Align frontend message types with the backend WebSocket event types
  - Ensure proper handling of all event types: `ready`, `initialized`, `turn`, `turn-completed`, `completed`, `error`
  - Implement clear mapping from WebSocket events to UI components

### 3. Improve Chat Component Implementation

Update the chat components to properly handle WebSocket streaming.

- **Target Files**:
  - `/web/src/components/shared/chat/MessageList.tsx`
  - `/web/src/components/shared/chat/MessageBubble.tsx`
  - `/web/src/components/shared/chat/ChatInput.tsx`

- **Implementation Details**:
  - Update MessageList to handle streaming messages correctly
  - Improve turn handling in MessageBubble to match the WebSocket event structure
  - Update ChatInput to properly handle WebSocket connection state

### 4. Implement Tool Call Processing

Ensure tool calls are properly extracted and displayed from the WebSocket stream.

- **Target Files**:
  - `/web/src/components/shared/chat/MessageBubble.tsx`
  - `/web/src/components/shared/chat/ToolCallDisplay.tsx`

- **Implementation Details**:
  - Update tool call extraction logic to match the WebSocket event format
  - Ensure proper rendering of tool calls and their responses
  - Add better error handling for malformed tool calls

### 5. Update Zustand Store Integration

Ensure the session store properly integrates with the WebSocket streaming.

- **Target Files**:
  - `/web/src/stores/sessionStore.ts`
  - `/web/src/stores/session/sessions.ts` (if needed)

- **Implementation Details**:
  - Add WebSocket-specific state to the store if needed
  - Update store actions to support WebSocket messaging
  - Ensure proper state synchronization with WebSocket events

### 6. Clean Up API Client

Remove deprecated endpoints and update the API client to reflect the WebSocket-only approach.

- **Target Files**:
  - `/web/src/lib/api/resources/sessions.ts`

- **Implementation Details**:
  - Remove any SSE-related endpoint calls
  - Update documentation to reflect WebSocket usage
  - Add proper error handling for WebSocket connectivity issues

## Implementation Order

1. **First Pass: Core WebSocket Implementation**
   - Consolidate the WebSocket logic in `useSessionStream.ts`
   - Update types to match the backend WebSocket events
   - Add comprehensive logging for debugging

2. **Second Pass: Component Updates**
   - Update MessageList and MessageBubble to handle the stream correctly
   - Implement proper tool call processing
   - Update ChatInput to reflect connection state

3. **Third Pass: Store Integration and Testing**
   - Update session store integration
   - Implement comprehensive testing
   - Address any edge cases or bugs

4. **Final Pass: Code Cleanup**
   - Remove deprecated hooks and functions
   - Clean up logging
   - Add documentation for future maintenance

## Testing Strategy

1. **Unit Testing**:
   - Test WebSocket connection management
   - Test message processing logic
   - Test tool call extraction

2. **Integration Testing**:
   - Test end-to-end flow with the backend
   - Test reconnection and error handling
   - Test with different message types and tool calls

3. **UI Testing**:
   - Test UI updates with streaming messages
   - Test input disabling/enabling during streaming
   - Test tool call display

## Deployment Considerations

1. **Backwards Compatibility**:
   - The old SSE endpoints are already returning 410 Gone
   - Ensure all clients use WebSockets exclusively

2. **Performance Monitoring**:
   - Add performance metrics for WebSocket connections
   - Monitor connection stability

3. **Error Handling**:
   - Implement graceful degradation if WebSockets fail
   - Add user-friendly error messages
