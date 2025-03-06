# Streaming API with SessionCoordinator

This guide explains the streaming functionality in the `SessionCoordinator` class, which enables real-time updates of AI responses.

## Overview

The SessionCoordinator now provides streaming capabilities through the following features:

1. An enhanced `handleRequest` method that returns the response ID immediately
2. A new `streamRequest` method that provides a convenient streaming interface
3. A utility method to fetch complete round data by response ID

These changes make it easier to:

- Get immediate access to the response ID for streaming
- Stream turn updates as they happen
- Access complete round data after processing is done

## API Reference

### `handleRequest`

The `handleRequest` method has been enhanced to return the response ID immediately, along with a promise that resolves when processing is complete.

```typescript
async handleRequest(sessionId: string, requestContent: string): Promise<{
  responseId: string;
  completionPromise: Promise<void>;
}>
```

**Example usage:**
```typescript
const { responseId, completionPromise } = await coordinator.handleRequest(sessionId, "Tell me about quantum computing");

// Set up your own streaming using the response ID
const unsubscribe = workspace.sessions.trackStreamingTurns(responseId, (turn) => {
  console.log("Update:", turn.content);
});

// Wait for completion if needed
await completionPromise;
unsubscribe();
```

### `streamRequest`

The `streamRequest` method provides a higher-level interface for streaming, returning an async iterable of turn updates.

```typescript
async streamRequest(sessionId: string, requestContent: string): Promise<{
  responseId: string;
  stream: AsyncIterable<Turn>;
  completionPromise: Promise<void>;
}>
```

**Example usage:**
```typescript
const { responseId, stream, completionPromise } = await coordinator.streamRequest(sessionId, "Tell me about quantum computing");

// Process streaming updates using for-await loop
for await (const turn of stream) {
  console.log("Update:", turn.content);
  
  // Access tool calls if present
  if (turn.parsedToolCalls?.call) {
    console.log("Tool call:", turn.parsedToolCalls.call);
  }
}

// Alternatively, wait for completion
await completionPromise;
```

### `getRoundByResponseId`

The `getRoundByResponseId` method allows you to fetch complete round data using a response ID.

```typescript
async getRoundByResponseId(responseId: string): Promise<{
  round: Round;
  request: Request;
  response: Response;
}>
```

**Example usage:**
```typescript
// After streaming is complete, get the full round data
const roundData = await coordinator.getRoundByResponseId(responseId);
console.log("Full response:", roundData.response);
console.log("Request:", roundData.request);
```

## Integration with API

When integrating with an API, you can use these methods to implement streaming endpoints:

1. **REST API with Server-Sent Events (SSE)**:
   ```typescript
   app.post('/api/chat/stream', async (req, res) => {
     const { sessionId, content } = req.body;
     
     // Set up SSE headers
     res.setHeader('Content-Type', 'text/event-stream');
     res.setHeader('Cache-Control', 'no-cache');
     res.setHeader('Connection', 'keep-alive');
     
     // Start the stream
     const { stream } = await coordinator.streamRequest(sessionId, content);
     
     // Send each update as an SSE event
     for await (const turn of stream) {
       res.write(`data: ${JSON.stringify(turn)}\n\n`);
     }
     
     res.end();
   });
   ```

2. **WebSocket API**:
   ```typescript
   wss.on('connection', (ws) => {
     ws.on('message', async (message) => {
       const { type, sessionId, content } = JSON.parse(message);
       
       if (type === 'chat') {
         const { responseId, stream } = await coordinator.streamRequest(sessionId, content);
         
         // Send the response ID immediately
         ws.send(JSON.stringify({ type: 'response_id', responseId }));
         
         // Stream updates
         for await (const turn of stream) {
           ws.send(JSON.stringify({ type: 'update', turn }));
         }
         
         // Signal completion
         ws.send(JSON.stringify({ type: 'complete', responseId }));
       }
     });
   });
   ```

## Error Handling

The streaming functionality includes proper error handling:

- If the stream is abandoned early, cleanup happens automatically
- Errors during processing are propagated through the `completionPromise`
- Each turn includes a status field indicating if it completed successfully

Always implement proper error handling in your client code to gracefully handle connection issues or processing errors.