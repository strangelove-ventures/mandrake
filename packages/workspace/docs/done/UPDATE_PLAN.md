# Workspace Package Implementation Plan

## File Structure

```bash
packages/workspace/
├── src/
│   ├── managers/
│   │   ├── base.ts          # Base config manager (existing)
│   │   ├── dynamic.ts       # Dynamic context manager (existing) 
│   │   ├── files.ts         # New files manager
│   │   ├── models.ts        # Updated models manager
│   │   ├── prompt.ts        # Existing prompt manager
│   │   └── tools.ts         # Updated tools manager
│   └── types/
│       ├── files.ts         # File manager types
│       ├── models.ts        # Updated model types
│       └── tools.ts         # Updated tool types
└── tests/
    └── managers/
        ├── files.test.ts    # File manager tests
        ├── models.test.ts   # Updated model manager tests  
        └── tools.test.ts    # Updated tool manager tests
```

## Type Definitions

```typescript
// types/files.ts
export interface FileInfo {
  name: string;
  content: string;
  active: boolean;
}

// types/models.ts
export interface WorkspaceModelsConfig {
  active: string;
  providers: Record<string, {
    type: 'anthropic' | 'ollama' | 'openai';
    apiKey?: string;
    baseUrl?: string;
  }>;
  models: Record<string, {
    enabled: boolean;
    providerId: string;
    modelId: string; 
    config: {
      temperature?: number;
      maxTokens?: number;
    }
  }>;
}

// types/tools.ts
export type ToolConfig = Record<string, ServerConfig>;
export type ToolConfigs = Record<string, ToolConfig>;

export interface ToolsConfig {
  active: string;
  configs: ToolConfigs;
}
```

## Manager Implementations

### FilesManager

```typescript
export class FilesManager {
  constructor(private basePath: string) {}

  async list(active: boolean = true): Promise<FileInfo[]>
  async get(name: string): Promise<FileInfo>
  async create(name: string, content: string, active: boolean = true): Promise<void>
  async update(name: string, content: string): Promise<void>
  async delete(name: string): Promise<void>
  async setActive(name: string, active: boolean): Promise<void>

  private getFilePath(name: string, active: boolean): string
  private ensureDirectories(): Promise<void>
}
```

### ModelsManager

```typescript
export class ModelsManager extends BaseConfigManager<WorkspaceModelsConfig> {
  // Provider operations
  async listProviders(): Promise<Record<string, ProviderConfig>>
  async getProvider(id: string): Promise<ProviderConfig>
  async addProvider(id: string, config: ProviderConfig): Promise<void>
  async updateProvider(id: string, config: Partial<ProviderConfig>): Promise<void>
  async removeProvider(id: string): Promise<void>

  // Model operations
  async listModels(): Promise<Record<string, ModelConfig>>
  async getModel(id: string): Promise<ModelConfig>
  async addModel(id: string, config: ModelConfig): Promise<void>
  async updateModel(id: string, config: Partial<ModelConfig>): Promise<void>
  async removeModel(id: string): Promise<void>

  // Active model
  async getActive(): Promise<string>
  async setActive(id: string): Promise<void>

  protected getDefaults(): WorkspaceModelsConfig {
    return {
      active: '',
      providers: {},
      models: {}
    }
  }
}
```

### ToolsManager

```typescript
export class ToolsManager extends BaseConfigManager<ToolsConfig> {
  // Config set operations
  async listConfigSets(): Promise<string[]>
  async getConfigSet(id: string): Promise<ToolConfig>
  async addConfigSet(id: string, config: ToolConfig): Promise<void>
  async updateConfigSet(id: string, config: Partial<ToolConfig>): Promise<void>
  async removeConfigSet(id: string): Promise<void>

  // Server config operations within a set
  async getServerConfig(setId: string, serverId: string): Promise<ServerConfig>
  async addServerConfig(setId: string, serverId: string, config: ServerConfig): Promise<void>
  async updateServerConfig(setId: string, serverId: string, config: Partial<ServerConfig>): Promise<void>
  async removeServerConfig(setId: string, serverId: string): Promise<void>

  // Active config set
  async getActive(): Promise<string>
  async setActive(id: string): Promise<void>

  protected getDefaults(): ToolsConfig {
    return {
      active: 'default',
      configs: {
        default: {
          filesystem: {
            // Default filesystem config
          },
          git: {
            // Default git config  
          }
        }
      }
    }
  }
}
```

## Testing Plan

Each manager should have a full suite of integration tests. Test files should follow this pattern:

```typescript
describe('FilesManager', () => {
  let tmpDir: string;
  let manager: FilesManager;

  beforeEach(async () => {
    tmpDir = await createTempDir();
    manager = new FilesManager(tmpDir);
  });

  afterEach(async () => {
    await cleanup(tmpDir);
  });

  describe('CRUD operations', () => {
    test('creates and reads files', async () => {
      await manager.create('test.md', 'content');
      const file = await manager.get('test.md');
      expect(file.content).toBe('content');
    });
    // Additional CRUD tests
  });

  describe('active/inactive operations', () => {
    test('moves files between active/inactive', async () => {
      await manager.create('test.md', 'content');
      await manager.setActive('test.md', false);
      const files = await manager.list(false);
      expect(files[0].name).toBe('test.md');
    });
  });
});
```

Similar comprehensive test suites for ModelsManager and ToolsManager, testing:

- CRUD operations for all entity types
- Error cases and validation
- Default configurations
- Active/inactive state management
- Concurrent operations
- File system edge cases

## Implementation Steps

1. Update type definitions
2. Implement FilesManager with basic CRUD
3. Add active/inactive support to FilesManager
4. Update ModelsManager to new schema
5. Update ToolsManager with config sets
6. Write comprehensive tests
7. Add integration tests
8. Document APIs
9. Update relevant workspace manager code