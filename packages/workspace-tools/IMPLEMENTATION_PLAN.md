# Implementation Plan: Workspace Tools

## Overview
The workspace-tools package provides a Model Context Protocol (MCP) server that exposes WorkspaceManager functionality through a natural language interface. This enables LLMs to manage Mandrake workspaces through commands like "add a new file" or "configure this model".

## Directory Structure
```
packages/workspace-tools/
├── src/
│   ├── index.ts              # Main export
│   ├── server.ts             # MCP server setup
│   ├── types.ts              # Shared types
│   ├── tools/                # Tool implementations
│   │   ├── dynamic.ts        # Dynamic context management
│   │   ├── files.ts          # File management 
│   │   ├── models.ts         # Model configuration
│   │   ├── prompt.ts         # System prompt management
│   │   └── index.ts          # Tool exports
│   └── utils/
│       └── validation.ts     # Common validation logic
├── tests/
│   ├── tools/                # Tool tests
│   │   ├── dynamic.test.ts
│   │   ├── files.test.ts
│   │   ├── models.test.ts
│   │   └── prompt.test.ts
│   └── utils/
│       ├── test-helpers.ts   # Testing utilities
│       └── validation.test.ts
├── package.json
└── tsconfig.json
```

## Core Types

```typescript
// Tool context containing workspace manager
interface WorkspaceToolContext {
  workspace: WorkspaceManager;
  workingDir: string;         // Current workspace directory
  allowedDirs: string[];      // Directories tools can access
}

// Base response type for all tools
interface ToolResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

// Tool configuration
interface WorkspaceTool {
  name: string;
  description: string;
  parameters: ZodSchema;
  execute: (args: unknown, context: WorkspaceToolContext) => Promise<ToolResponse>;
}
```

## Tool Implementations

### Dynamic Context Management
```typescript
// tools/dynamic.ts
export const dynamicContextTool: WorkspaceTool = {
  name: "manage_dynamic_context",
  description: "Add, remove, or update dynamic context configuration",
  parameters: z.object({
    action: z.enum(["add", "remove", "update", "list"]),
    name: z.string().optional(),
    command: z.string().optional(),
    enabled: z.boolean().optional()
  }),
  execute: async (args, context) => {
    const { action, name, command, enabled } = args;
    const manager = context.workspace.dynamicContextManager;

    switch (action) {
      case "add":
        await manager.create({ name, command, enabled });
        return { success: true, message: `Added dynamic context: ${name}` };
      // ... other actions
    }
  }
};
```

### Files Management
```typescript
// tools/files.ts  
export const filesManagementTool: WorkspaceTool = {
  name: "manage_files",
  description: "Manage workspace context files",
  parameters: z.object({
    action: z.enum(["add", "remove", "update", "list"]),
    path: z.string().optional(),
    content: z.string().optional()
  }),
  execute: async (args, context) => {
    const { action, path, content } = args;
    const manager = context.workspace.filesManager;

    switch (action) {
      case "add":
        await manager.writeFile(path, content);
        return { success: true, message: `Created file: ${path}` };
      // ... other actions
    }
  }
};
```

### Models Configuration
```typescript
// tools/models.ts
export const modelsConfigTool: WorkspaceTool = {
  name: "manage_models",
  description: "Configure models for the workspace",
  parameters: z.object({
    action: z.enum(["add", "remove", "update", "list", "enable"]),
    provider: z.string().optional(),
    model: z.string().optional(),
    apiKey: z.string().optional()
  }),
  execute: async (args, context) => {
    const { action, provider, model } = args;
    const manager = context.workspace.modelManager;

    switch (action) {
      case "enable":
        await manager.enableModel(provider, model);
        return { success: true, message: `Enabled model: ${provider}/${model}` };
      // ... other actions
    }
  }
};
```

### System Prompt Management
```typescript
// tools/prompt.ts
export const promptManagementTool: WorkspaceTool = {
  name: "manage_prompt",
  description: "Update the system prompt for this workspace",
  parameters: z.object({
    action: z.enum(["get", "update"]),
    prompt: z.string().optional()
  }),
  execute: async (args, context) => {
    const { action, prompt } = args;
    const manager = context.workspace.promptManager;

    switch (action) {
      case "update":
        await manager.setPrompt(prompt);
        return { success: true, message: "Updated system prompt" };
      // ... other actions  
    }
  }
};
```

## Server Implementation
```typescript
// server.ts
export class WorkspaceToolServer extends MCPServer {
  private context: WorkspaceToolContext;

  constructor(workspace: WorkspaceManager, config: MCPConfig) {
    super(config);
    this.context = {
      workspace,
      workingDir: workspace.rootDir,
      allowedDirs: [workspace.rootDir]
    };

    // Register tools
    this.registerTool(dynamicContextTool);
    this.registerTool(filesManagementTool);
    this.registerTool(modelsConfigTool);
    this.registerTool(promptManagementTool);
  }

  protected async executeTool(name: string, args: unknown): Promise<ToolResponse> {
    const tool = this.getTool(name);
    return tool.execute(args, this.context);
  }
}
```

## Testing Strategy

1. Unit Tests
   - Test each tool in isolation using a mocked WorkspaceManager
   - Verify parameter validation
   - Test success/error cases for each action
   - Ensure proper error messages

2. Integration Tests
   - Test tools with real WorkspaceManager 
   - Create temporary test workspaces
   - Verify file/config changes
   - Test tool interactions

Example Test:
```typescript
// tests/tools/dynamic.test.ts
describe('Dynamic Context Tool', () => {
  let workspace: WorkspaceManager;
  let context: WorkspaceToolContext;
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTempWorkspace();
    workspace = new WorkspaceManager(testDir);
    context = {
      workspace,
      workingDir: testDir,
      allowedDirs: [testDir]
    };
  });

  afterEach(async () => {
    await cleanup(testDir);
  });

  test('adds new dynamic context', async () => {
    const result = await dynamicContextTool.execute({
      action: 'add',
      name: 'git-status',
      command: 'git status',
      enabled: true
    }, context);

    expect(result.success).toBe(true);
    const config = await workspace.dynamicContextManager.list();
    expect(config).toContainEqual({
      name: 'git-status',
      command: 'git status',
      enabled: true
    });
  });
});
```

## Security Considerations

1. Command Validation
   - Validate and sanitize all command inputs
   - Prevent dangerous filesystem operations
   - Restrict to allowed directories

2. Sensitive Data
   - Safely handle API keys and credentials
   - Implement proper secret storage
   - Validate token permissions

3. Resource Limits
   - Implement timeouts for long-running operations
   - Add rate limiting for file operations
   - Set size limits for file content

## Next Steps

1. Create package scaffolding and core types
2. Implement base tool framework
3. Add individual tools one at a time with tests
4. Add MCP server implementation
5. Write documentation and examples
6. Integration with main Mandrake CLI