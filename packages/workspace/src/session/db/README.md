# Database Schema and Entity Mapping

This directory contains the SQLite database schema used by the SessionManager to store sessions, requests, responses, turns and other related data.

## Architecture

The database implementation follows a clean architecture pattern:

1. **Database Schema**: Defined in `/schema` using Drizzle ORM.
2. **Entity Types**: Pure entity interfaces are defined in the `@mandrake/utils` package.
3. **Mappers**: Conversion functions in `/mappers.ts` handle the transformation between DB schema types and entity types.

## When Updating the Database Schema

If you need to modify the database schema, follow these steps:

1. **Update the schema definition** in `/schema/*.ts` files
2. **Update the entity interfaces** in `@mandrake/utils/src/types/session/entities.ts`
3. **Modify the mapper functions** in `../mappers.ts` to handle the conversion between types
4. **Create a migration** using Drizzle's migration tools
5. **Update tests** to reflect the schema changes

### Example: Adding a New Field

```typescript
// 1. Update the schema in schema/sessions.ts
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title'),
  description: text('description'),
  metadata: text('metadata').notNull().default('{}'),
  newField: text('newField'), // New field added
  // ...
});

// 2. Update the entity interface in @mandrake/utils
export interface SessionEntity {
  id: string;
  title: string | null;
  description: string | null;
  metadata: Record<string, string> | string;
  newField: string | null; // New field added
  createdAt: Date;
  updatedAt: Date;
}

// 3. Update the mapper in mappers.ts
export function mapSessionToEntity(session: Session): SessionEntity {
  return {
    id: session.id,
    title: session.title,
    description: session.description,
    metadata: session.metadata as any,
    newField: session.newField, // New field mapped
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  };
}
```

## Mapper Functions

The mapper functions in `../mappers.ts` are crucial for maintaining the boundary between database implementation details and the rest of the application:

- `mapSessionToEntity`: Converts DB Session to SessionEntity
- `mapRequestToEntity`: Converts DB Request to RequestEntity
- `mapResponseToEntity`: Converts DB Response to ResponseEntity
- `mapRoundToEntity`: Converts DB Round to RoundEntity
- `mapTurnToEntity`: Converts DB Turn to TurnEntity
- `parseToolCalls`: Parses tool calls from JSON string to ToolCall object

These mappers ensure that consumers of the SessionManager API don't need to know about the database implementation details.

## Benefits of This Approach

- **Decoupling**: Other packages only depend on entity interfaces, not DB implementation
- **Type Safety**: Strong typing throughout the system
- **Flexibility**: Ability to change database implementation without affecting consumers
- **Testability**: Easier to test components in isolation