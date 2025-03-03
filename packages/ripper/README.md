# Ripper

Ripper is a filesystem tool server for Mandrake that provides file access capabilities through the Model Context Protocol.

## Overview

Ripper enables file system operations like reading, writing, and searching files, providing these tools to LLM sessions in Mandrake.

## Building and Installation

### Development Build

For development, build the TypeScript source:

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build
```

This will generate the JavaScript files in the `dist/` directory.

### Standalone Binary

For production use, you can create a standalone executable:

```bash
# Create the standalone binary
npm run package
```

This creates a self-contained executable at `./bin/ripper-server` that can be run directly without requiring `bun` or Node.js to be installed.

## Usage

### Using as a Library

```js
import { RipperTools } from '@mandrake/ripper';

// Get all available tools
const tools = RipperTools.getTools();
```

### Running as a Server

#### Development Mode

```bash
bun run ./dist/server.js --transport=stdio --workspaceDir=/path/to/workspace
```

#### Production Mode (Standalone Binary)

```bash
./bin/ripper-server --transport=stdio --workspaceDir=/path/to/workspace
```

### Command Line Options

- `--transport`: Communication transport (stdio or http)
- `--workspaceDir`: Root directory for file operations
- `--excludePatterns`: Glob patterns to exclude (comma separated)
- `--port`: Port for HTTP transport (default: auto)
- `--host`: Host for HTTP transport (default: localhost)

## Tools Provided

- `list_directory`: List files and directories
- `read_file`: Read the content of a file
- `write_file`: Create or update a file
- `search_files`: Find files matching criteria
- `edit_file`: Make edits to a file's content
- `create_directory`: Create a new directory
- `move_file`: Move or rename a file
- `directory_tree`: Get nested directory structure
- `get_file_info`: Get file metadata

## Testing

```bash
npm test
```

## Docker

The package can also be built as a Docker container:

```bash
npm run build-image
```

This creates a Docker image named `mandrake/ripper`.
