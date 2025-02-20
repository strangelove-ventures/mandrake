# Ripper Implementation Plan

Ripper is Mandrake's core tooling server, providing filesystem and command execution capabilities. Named after Brigadier General Jack D. Ripper from Dr. Strangelove, it pairs with Mandrake (Group Captain Lionel Mandrake) to provide essential workspace functionality.

## Tools

### File Operations

1. `read_files`
   - Read single or multiple files
   - Returns content with file paths
   - Handle encoding/errors gracefully

2. `write_file`
   - Create/overwrite files
   - Auto-create parent directories
   - Support text content with encoding
   - Return success/error messages

3. `edit_file`
   - SEARCH/REPLACE based editing
   - Return git-style diffs
   - Optional dry-run mode
   - Handle indentation/whitespace

4. `move_file`
   - Move/rename files and directories
   - Auto-create parent directories in destination
   - Security checks on both paths
   - Handle existing files
   - Preserve permissions

### Directory Operations

1. `create_directory`
   - Recursive directory creation
   - Silent if exists
   - Permission handling
   - Path validation

2. `list_directory`
   - List contents with FILE/DIR prefixes
   - Optional recursive mode
   - Clear formatting
   - Error handling for permissions

3. `tree`
   - Tree visualization
   - Support .gitignore
   - Multiple formats (ASCII/JSON)
   - Depth control
   - Uses directory-tree + ignore packages

### Search

1. `search_files`
   - Regex-based search
   - Context around matches
   - Support .gitignore
   - Extension/pattern filtering

### System

1. `execute_command`
   - Run system commands
   - Security validation
   - Approval system
   - Stream output
   - Error handling

2. `list_allowed_directories`
   - Show security boundaries
   - Validate access
   - Clear formatting

## Shared Utils

### Path Management (`src/utils/paths.ts`)

```typescript
export function normalizePath(path: string): string
export function validatePath(path: string, allowedDirs: string[]): Promise<string>
export function expandHomePath(path: string): string
export function isSubPath(parent: string, child: string): boolean
```

### File Operations (`src/utils/files.ts`)

```typescript
export async function ensureDir(path: string): Promise<void>
export async function safeReadFile(path: string): Promise<string>
export async function safeWriteFile(path: string, content: string): Promise<void>
export async function safeMove(src: string, dest: string): Promise<void>
```

### Command Execution (`src/utils/command.ts`)

```typescript
export interface CommandOptions {
  cwd?: string
  env?: Record<string, string>
  requiresApproval?: boolean
}

export async function executeCommand(
  command: string, 
  options: CommandOptions
): Promise<CommandResult>

export function validateCommand(command: string): boolean
```

### Error Handling (`src/utils/errors.ts`)

```typescript
export class RipperError extends Error {
  constructor(message: string, public code: ErrorCode)
}

export enum ErrorCode {
  INVALID_PATH,
  PERMISSION_DENIED,
  COMMAND_FAILED,
  // etc
}
```

## Package Structure

```sh
packages/ripper/
├── src/
│   ├── tools/          # Individual tool implementations
│   │   ├── read_files.ts
│   │   ├── write_file.ts
│   │   ├── edit_file.ts
│   │   ├── move_file.ts
│   │   ├── create_directory.ts
│   │   ├── list_directory.ts
│   │   ├── tree.ts
│   │   ├── search_files.ts
│   │   ├── execute_command.ts
│   │   └── list_allowed_directories.ts
│   ├── utils/          # Shared utilities
│   │   ├── paths.ts
│   │   ├── files.ts
│   │   ├── command.ts
│   │   └── errors.ts
│   ├── types.ts        # Shared types/interfaces
│   ├── constants.ts    # Constants and configs
│   ├── server.ts       # FastMCP server setup
│   └── index.ts        # Public exports
├── tests/              # Test files mirroring src
├── package.json
└── tsconfig.json
```

## Dependencies

- `fastmcp`: Base MCP server framework
- `directory-tree`: Tree visualization
- `ignore`: .gitignore support
- `zod`: Schema validation
- Any needed Mandrake workspace packages

## Implementation Steps

1. Set up package structure and base files
2. Implement shared utils with tests
3. Create base server with FastMCP
4. Implement tools one at a time with tests
5. Integration testing
6. Documentation

## Security Considerations

- Always validate paths against allowed directories
- Safe command execution with approval system
- Proper error handling and logging
- Clear security boundaries
- Handle symlinks safely

## Testing Strategy

- Unit tests for each tool and utility
- Integration tests for full workflows
- Security boundary tests
- Error handling tests
- Performance tests for large directories/files
