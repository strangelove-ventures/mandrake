# Mandrake API Routes Implementation Guide

## Model Routes

### System-Level Model Routes

```sh
/api/models
/api/models/[modelId]
```

- Use `createModelRoutes()` from `index.ts`

```typescript
// For /api/models/route.ts
import { createModelRoutes } from '@/lib/api/factories/models';
export const { GET, POST } = createModelRoutes();

// For /api/models/[modelId]/route.ts
import { createModelRoutes } from '@/lib/api/factories/models';
export const { GET, PUT, DELETE } = createModelRoutes();
```

### System-Level Active Model Routes

```sh
/api/models/active
```

- Use `createActiveModelRoutes()` from `index.ts`

```typescript
// For /api/models/active/route.ts
import { createActiveModelRoutes } from '@/lib/api/factories/models';
export const { GET, PUT } = createActiveModelRoutes();
```

### Workspace-Level Model Routes

```sh
/api/workspaces/[id]/models
/api/workspaces/[id]/models/[modelId]
```

- Use `createModelRoutes(true)` from `index.ts`

```typescript
// For /api/workspaces/[id]/models/route.ts
import { createModelRoutes } from '@/lib/api/factories/models';
export const { GET, POST } = createModelRoutes(true);

// For /api/workspaces/[id]/models/[modelId]/route.ts
import { createModelRoutes } from '@/lib/api/factories/models';
export const { GET, PUT, DELETE } = createModelRoutes(true);
```

### Workspace-Level Active Model Routes

```sh
/api/workspaces/[id]/models/active
```

- Use `createActiveModelRoutes(true)` from `index.ts`

```typescript
// For /api/workspaces/[id]/models/active/route.ts
import { createActiveModelRoutes } from '@/lib/api/factories/models';
export const { GET, PUT } = createActiveModelRoutes(true);
```

## Provider Routes

### System-Level Provider Routes

```sh
/api/providers
/api/providers/[providerId]
```

- Use `createProviderRoutes()` from `index.ts`

```typescript
// For /api/providers/route.ts
import { createProviderRoutes } from '@/lib/api/factories/models';
export const { GET, POST } = createProviderRoutes();

// For /api/providers/[providerId]/route.ts
import { createProviderRoutes } from '@/lib/api/factories/models';
export const { GET, PUT, DELETE } = createProviderRoutes();
```

### Workspace-Level Provider Routes

```sh
/api/workspaces/[id]/providers
/api/workspaces/[id]/providers/[providerId]
```

- Use `createProviderRoutes(true)` from `index.ts`

```typescript
// For /api/workspaces/[id]/providers/route.ts
import { createProviderRoutes } from '@/lib/api/factories/models';
export const { GET, POST } = createProviderRoutes(true);

// For /api/workspaces/[id]/providers/[providerId]/route.ts
import { createProviderRoutes } from '@/lib/api/factories/models';
export const { GET, PUT, DELETE } = createProviderRoutes(true);
```
