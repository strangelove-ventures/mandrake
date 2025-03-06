# Mandrake Ripper Package Development Guide

## Commands
- Build package: `bun run build`
- Run all tests: `NODE_ENV=test bun test`
- Run specific test: `NODE_ENV=test bun test tests/tools/read_file.test.ts`
- Run by pattern: `NODE_ENV=test bun test --test-name-pattern "reads single file"`
- Run focused tests: `NODE_ENV=test bun test --only` (with test.only() in test file)
- Build executable: `bun run build-exec`
- Build Docker image: `bun run build-image`
- Clean build: `bun run clean`

## Project Structure
- `src/server.ts`: Main server entry point with MCP tool setup
- `src/fastmcp.ts`: FastMCP server implementation
- `src/tools/`: Individual file and directory operation tools
- `src/utils/`: Shared utilities for paths, files, and commands
- `tests/tools/`: Tests for each individual tool

## Code Style
- **Security**: Validate paths against allowedDirs before any operation
- **Error Handling**: Use RipperError with specific error codes
- **Zod Schemas**: Define parameter validation with Zod schemas
- **Testing**: Create isolated test directories for each test
- **Tool Pattern**: Each tool follows consistent factory function pattern
- **JSON Results**: Tools return structured JSON results

## Architecture
- FastMCP server with stdio or HTTP/SSE transport
- SecurityContext with allowedDirs and excludePatterns
- Tool modules follow MCP protocol with name, description, parameters
- Path validation ensures operations stay within allowed directories
- Command execution with security validation and approved commands