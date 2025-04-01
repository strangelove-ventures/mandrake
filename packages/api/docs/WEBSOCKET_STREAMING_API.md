# WebSocket Streaming API

This document describes the WebSocket-based streaming API for Mandrake sessions.

## Overview

The WebSocket streaming API provides a bidirectional, real-time communication channel for LLM sessions. Key benefits include:

1. **Single persistent connection** for multiple request/response pairs within a session
2. **No CSP (Content Security Policy) issues** that can occur with Server-Sent Events (SSE)
3. **Lower latency** for subsequent requests after the initial connection
4. **Better error handling** and connection management
5. **Bidirectional communication** for interactive sessions

## Connection Endpoints

WebSocket connections are established at the following endpoints:

### System Sessions
```
ws://server/api/system/sessions/{sessionId}/streaming/ws
```

### Workspace Sessions
```
ws://server/api/workspaces/{workspaceId}/sessions/{sessionId}/streaming/ws
```

Where:
- `server` is the hostname and port (if needed)
- `sessionId` is the UUID of the session
- `workspaceId` is the UUID of the workspace (for workspace sessions)

Use `wss://` for secure connections.

## Message Flow

The typical message flow for a streaming session is:

1. **Client connects** to the WebSocket endpoint
2. **Server sends `ready` event** indicating the WebSocket connection is established
3. **Client sends request** with content
4. **Server sends `initialized` event** with session and response IDs
5. **Server streams multiple `turn` events** as content is generated
6. When a turn is completed, server sends a **`turn-completed` event**
7. When the entire response is done, server sends a **`completed` event**
8. **Connection remains open** for further client requests (return to step 3)

## Event Types

### From Server to Client

1. **`ready` Event**
   ```json
   {
     "type": "ready",
     "sessionId": "0240a793-5cf1-484c-a05d-f88699c48881"
   }
   ```
   Sent immediately after WebSocket connection is established.

2. **`initialized` Event**
   ```json
   {
     "type": "initialized",
     "sessionId": "0240a793-5cf1-484c-a05d-f88699c48881",
     "responseId": "b6e81bf4-b3ea-4f85-b71a-17680c992912"
   }
   ```
   Sent when the session has initialized and begun processing a request.

3. **`turn` Event**
   ```json
   {
     "type": "turn",
     "turnId": "089815bc-19c4-479a-90b7-ac7e16d6cc33",
     "index": 0,
     "content": "Based on the system information...",
     "status": "streaming",
     "toolCalls": {
       "call": null,
       "response": null
     }
   }
   ```
   Multiple turn events are sent as content is generated. The `toolCalls` property may contain tool call information when present.

4. **`turn` Event with Tool Calls**
   ```json
   {
     "type": "turn",
     "turnId": "089815bc-19c4-479a-90b7-ac7e16d6cc33",
     "index": 0,
     "content": "Running the hostname command...",
     "status": "streaming",
     "toolCalls": {
       "call": {
         "serverName": "ripper",
         "methodName": "execute",
         "arguments": {
           "command": "hostname"
         }
       },
       "response": "macbook-pro.local"
     }
   }
   ```
   Tool calls and their responses appear within the turn events.

5. **`turn-completed` Event**
   ```json
   {
     "type": "turn-completed",
     "turnId": "089815bc-19c4-479a-90b7-ac7e16d6cc33",
     "status": "completed"
   }
   ```
   Sent when a turn is completed.

6. **`completed` Event**
   ```json
   {
     "type": "completed",
     "sessionId": "0240a793-5cf1-484c-a05d-f88699c48881", 
     "responseId": "b6e81bf4-b3ea-4f85-b71a-17680c992912"
   }
   ```
   Sent when the entire response is completed.

7. **`error` Event**
   ```json
   {
     "type": "error",
     "message": "Error message details"
   }
   ```
   Sent when an error occurs.

### From Client to Server

1. **Request Message**
   ```json
   {
     "content": "What is the current date and time?"
   }
   ```
   Client sends this to initiate a conversation turn.

## Client Implementation

A typical client implementation includes:

1. **Establishing a WebSocket connection**
2. **Setting up event handlers** for message types
3. **Sending requests** when needed
4. **Processing streamed responses**
5. **Managing connection state**

Example in TypeScript:

```typescript
// Create a WebSocket connection for a session
function createSessionStream(workspaceId, sessionId) {
  // Build WebSocket URL
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const baseUrl = `${protocol}//${window.location.host}/api`;
  const url = workspaceId 
    ? `${baseUrl}/workspaces/${workspaceId}/sessions/${sessionId}/streaming/ws`
    : `${baseUrl}/system/sessions/${sessionId}/streaming/ws`;

  // Create WebSocket
  const ws = new WebSocket(url);
  
  // Set up event handlers
  ws.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    
    // Process different event types
    switch (data.type) {
      case 'ready':
        // Connection is ready for requests
        break;
      case 'initialized':
        // Request has been initialized
        break;
      case 'turn':
        // Process content update
        // Handle tool calls if present
        break;
      case 'completed':
        // Response is complete
        break;
      case 'error':
        // Handle error
        break;
    }
  });
  
  // Return interface
  return {
    sendMessage: (content) => {
      ws.send(JSON.stringify({ content }));
    },
    close: () => ws.close()
  };
}
```

## Connection Management

1. **Connection Persistence**: The WebSocket connection remains open for the entire session, allowing multiple request/response pairs.

2. **Reconnection Logic**: Clients should implement reconnection logic with exponential backoff for network disruptions.

3. **Connection Closure**: The server will not automatically close connections, even after completion events. Clients can maintain long-lived connections or close when appropriate for their use case.

4. **Heartbeats**: For very long-lived connections, consider implementing heartbeats to detect stale connections.

## Error Handling

1. **Error Events**: The server sends specific error events when issues occur.

2. **WebSocket Errors**: The client should handle native WebSocket errors and connection problems.

3. **Recovery**: After connection failures, clients should attempt to reconnect and potentially resend the last request if it was interrupted.

## Security Considerations

1. **Authentication**: The WebSocket connection inherits the authentication context from the HTTP session.

2. **Input Validation**: All client messages are validated server-side.

3. **Rate Limiting**: Multiple rapid requests may be subject to rate limiting.

## Best Practices

1. **Single Connection Per Session**: Maintain one WebSocket connection per session rather than opening/closing for each request.

2. **Error Recovery**: Implement proper error handling and reconnection logic.

3. **State Management**: Track the state of turns and responses to handle potential out-of-order messages.

4. **Content Buffering**: Buffer content from multiple turn events to reconstruct the complete response.

5. **Tool Call Handling**: Process tool calls and their results as they appear within turn events.

## Migration from SSE

The Server-Sent Events (SSE) endpoint is now deprecated in favor of WebSockets. The SSE endpoint returns a 410 Gone status with directions to use the WebSocket endpoint.