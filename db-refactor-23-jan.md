# Database Refactor Plan - January 23, 2025

This document outlines the plan for refactoring Mandrake's database schema to better support the core architectural goals and improve the data model for chat sessions.

## Current Issues

1. Message-based storage doesn't properly reflect the request/response cycle
2. Tool calls and their results aren't properly persisted
3. No explicit tracking of turns within responses
4. Schema uses "conversation" terminology instead of "session"

## Schema Changes

### New Schema Structure

```prisma
model Workspace {
  id          String    @id @default(uuid())
  name        String
  description String?
  config      Json?         
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  sessions    Session[]

  @@index([createdAt])
}

model Session {
  id          String    @id @default(uuid())
  title       String?     
  workspaceId String      
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  rounds      Round[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([workspaceId, updatedAt])
}

model Round {
  id         String   @id @default(uuid())
  sessionId  String
  session    Session  @relation(fields: [sessionId], references: [id])
  request    Request  @relation(fields: [requestId], references: [id])
  requestId  String   @unique
  response   Response @relation(fields: [responseId], references: [id])
  responseId String   @unique
  index      Int      
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([sessionId, index])
}

model Request {
  id        String   @id @default(uuid())
  round     Round?   
  content   String   
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Response {
  id        String   @id @default(uuid())
  round     Round?
  turns     Turn[]   
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Turn {
  id         String   @id @default(uuid())
  responseId String
  response   Response @relation(fields: [responseId], references: [id])
  index      Int      
  toolCall   Json?    // {server: string, input: any}
  toolResult Json?    // Output data from tool
  content    String?  // Text content if not a tool call
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([responseId, index])
}
```

### Key Changes

1. Renamed `Conversation` to `Session`
2. Introduced `Round` model to encapsulate request/response pairs
3. Split messages into `Request` and `Response` models
4. Added `Turn` model for tracking tool interactions
5. Added proper foreign key relationships throughout

## Implementation Plan

### Phase 1: Schema Migration

1. Update Storage Package Schema
   - Location: `/packages/storage/prisma/schema.prisma`
   - Tasks:
     - Add new models
     - Create migration
     - No need to preserve existing data
     - Update prisma client generation

2. Storage Package Updates
   - Location: `/packages/storage/src/`
   - Files to update:
     - `index.ts`: Export new types/models
     - Add helper methods for session history
     - Add methods to construct message format for LLM APIs

### Phase 2: Code Updates

1. Update Chat Implementation
   - Location: `/apps/web/src/lib/mandrake-chat.ts`
   - Changes needed:
     - Rename conversation references to session
     - Update stream processor to track turns
     - Modify message history building for new schema
     - Add proper persistence of tool calls/results

2. Update Chat State Management
   - Location: `/apps/web/src/lib/chat-state.ts`
   - Changes needed:
     - Update state machine for turn tracking
     - Modify StreamProcessor to work with new models
     - Update message type definitions

3. Update API Routes
   - Rename directories:
     - `/api/chat/conversations` → `/api/chat/sessions`
     - `/api/chat/[conversationId]` → `/api/chat/[sessionId]`
   - Update handlers for new schema

4. Update UI Components
   - Location: `/apps/web/src/components/chat/`
   - Files to update:
     - `ChatInterface.tsx`
     - `MessageContent.tsx`
   - Changes needed:
     - Update prop types
     - Modify message rendering
     - Update any conversation references

### Implementation Steps

1. Schema Update

   ```bash
   cd packages/storage
   # Create new migration
   npx prisma migrate dev --name session_refactor
   # Update client
   npx prisma generate
   ```

2. Storage Package Updates
   - Add type definitions for tool calls/results
   - Add session loading methods
   - Add message construction helpers

3. MandrakeChat Updates
   - Modify stream handling to track turns
   - Update persistence logic for new schema
   - Add tool result storage

4. Chat State Updates
   - Update state machine for turn tracking
   - Modify stream processor
   - Add new state transitions

5. API Updates
   - Rename routes
   - Update handlers
   - Add new endpoints if needed

6. UI Updates
   - Update components
   - Add turn visualization if needed
   - Modify message display

### Testing Plan

1. Unit Tests
   - Add tests for new models
   - Update existing tests
   - Add turn tracking tests

2. Integration Tests
   - Test full chat flow
   - Verify tool call persistence
   - Check session loading

3. UI Tests
   - Verify message rendering
   - Check tool call display
   - Test session navigation

## Future Considerations

1. Performance Optimization
   - Add indexes for common queries
   - Optimize session loading
   - Consider caching strategies

2. Feature Additions
   - Add session search
   - Improve tool result display
   - Add session management UI

3. Monitoring
   - Add logging for turns
   - Track tool usage
   - Monitor performance

## Development Guidelines

1. Keep changes focused on schema update initially
2. Maintain separation of concerns
3. Use types from storage package
4. Keep code DRY
5. Document any new patterns or conventions
