# Schema Planning

This document outlines the database schema design for Mandrake, focusing on practical persistence patterns drawn from production LangChain applications while supporting our workspace architecture.

## Core Strategy

1. **Simplified Types**
   - Define our own DB-specific types rather than using LangChain's directly
   - Keep schema flat and storage-focused
   - Map to/from LangChain types at the application layer

2. **Type Definitions**
```typescript
// Database-specific message types
type DBMessageRole = 'user' | 'assistant' | 'system' | 'tool';

// Mapping types for LangChain compatibility
interface MessageMapping {
  // DB -> LangChain conversion
  toChatMessage(dbMessage: Message): BaseMessageFields;
  // LangChain -> DB conversion
  toDBMessage(lcMessage: BaseMessageFields): Message;
}
```

## Prisma Schema

```prisma
model Workspace {
  id            String         @id @default(uuid())
  name          String
  description   String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  // Configuration
  config        Json?          // Workspace settings and tool configs
  // Relations
  conversations Conversation[]
}

model Conversation {
  id          String      @id @default(uuid())
  title       String?     
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  // Workspace
  workspaceId String      
  workspace   Workspace   @relation(fields: [workspaceId], references: [id])
  // Messages
  messages    Message[]
  // Session tracking
  sessionId   String?     // For grouping related conversations
}

model Message {
  id              String       @id @default(uuid())
  conversationId  String      
  conversation    Conversation @relation(fields: [conversationId], references: [id])
  createdAt       DateTime     @default(now())
  // Core fields
  role            String       // DBMessageRole
  content         String       // Main message content
  // Tool usage
  toolCalls       Json?        // Tool calls made during this message
  sourceDocuments Json?        // References to source materials
  // Metadata
  metadata        Json?        // Additional fields from LangChain
}
```

## Implementation Notes

1. **Message Storage**
   - Store content directly as text when possible
   - Use JSON fields for complex data structures
   - Keep tool calls with their originating message

2. **LangChain Integration**
   - Create mapping layer in application code
   - Convert between DB and LangChain types explicitly
   - Handle complex content types in metadata

Example mapping:
```typescript
function toChatMessage(dbMessage: Message): BaseMessageFields {
  return {
    type: mapDBRole(dbMessage.role),
    content: dbMessage.content,
    additional_kwargs: dbMessage.metadata || {},
  };
}

function toDBMessage(lcMessage: BaseMessageFields): Message {
  return {
    role: mapLangChainRole(lcMessage.type),
    content: typeof lcMessage.content === 'string' 
      ? lcMessage.content 
      : JSON.stringify(lcMessage.content),
    metadata: lcMessage.additional_kwargs,
  };
}
```

3. **Workspace Integration**
   - Configuration stored as JSON for flexibility
   - Clear separation between config and content
   - Tool configuration scoped to workspace

4. **File Management**
   - File references stored in sourceDocuments
   - Actual files stored in workspace directory
   - Clear mapping between DB records and filesystem

## Query Patterns

Common queries to optimize for:
1. Get recent conversations for workspace
2. Get messages in conversation
3. Search across conversations
4. Tool usage analytics

Suggested indexes:
```prisma
  @@index([workspaceId, updatedAt]) // Recent conversations
  @@index([conversationId, createdAt]) // Message timeline
  @@index([sessionId]) // Session grouping
```

## Next Steps

1. **Initial Implementation**
   - Create base migration
   - Implement mapping layer
   - Add repository patterns
   - Write conversion tests

2. **Integration Testing**
   - Test with LangChain conversations
   - Verify tool call persistence
   - Check complex content handling
   - Validate workspace isolation

3. **Performance Optimization**
   - Add suggested indexes
   - Monitor query patterns
   - Optimize large JSON fields
   - Consider partitioning strategies
