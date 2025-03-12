import { describe, test, expect } from 'bun:test';
import {
  toolCallToMCPArguments,
  createToolResultFromMCP,
  toolResultToMCPResponse,
  parsedToolCallToMCPTool,
  mcpToolToParsedToolCall,
  createParsedToolCall
} from '../../src/tools/converters';
import type { ToolCall, ToolResult, ParsedToolCall } from '../../src/tools/types';
import type { MCPToolWithServer, ToolInvocationResponse } from '../../src/types/mcp/tools';

describe('Tool Converters', () => {
  describe('toolCallToMCPArguments', () => {
    test('should convert a ToolCall to MCP ToolArguments', () => {
      const toolCall: ToolCall = {
        name: 'fs.readFile',
        arguments: {
          path: '/path/to/file'
        }
      };

      const result = toolCallToMCPArguments(toolCall);
      expect(result).toEqual(toolCall);
    });
  });

  describe('createToolResultFromMCP', () => {
    test('should create a ToolResult from a successful MCP response', () => {
      const response: ToolInvocationResponse = {
        isError: false,
        content: 'File content here'
      };

      const result = createToolResultFromMCP('fs.readFile', response);
      expect(result).toEqual({
        name: 'fs.readFile',
        content: 'File content here'
      });
    });

    test('should create a ToolResult from an error MCP response', () => {
      const response: ToolInvocationResponse = {
        isError: true,
        content: 'File not found'
      };

      const result = createToolResultFromMCP('fs.readFile', response);
      expect(result).toEqual({
        name: 'fs.readFile',
        error: 'File not found'
      });
    });

    test('should handle non-string error content', () => {
      const response: ToolInvocationResponse = {
        isError: true,
        content: { code: 404, message: 'Not found' }
      };

      const result = createToolResultFromMCP('fs.readFile', response);
      expect(result).toEqual({
        name: 'fs.readFile',
        error: String({ code: 404, message: 'Not found' })
      });
    });
  });

  describe('toolResultToMCPResponse', () => {
    test('should convert a successful ToolResult to MCP response', () => {
      const toolResult: ToolResult = {
        name: 'fs.readFile',
        content: 'File content here'
      };

      const result = toolResultToMCPResponse(toolResult);
      expect(result).toEqual({
        isError: false,
        content: 'File content here'
      });
    });

    test('should convert an error ToolResult to MCP response', () => {
      const toolResult: ToolResult = {
        name: 'fs.readFile',
        error: 'File not found'
      };

      const result = toolResultToMCPResponse(toolResult);
      expect(result).toEqual({
        isError: true,
        content: 'File not found'
      });
    });
  });

  describe('parsedToolCallToMCPTool', () => {
    test('should convert a ParsedToolCall to an MCP Tool', () => {
      const parsedCall: ParsedToolCall = {
        serverName: 'fs',
        methodName: 'readFile',
        arguments: {
          path: '/path/to/file'
        },
        fullName: 'fs.readFile'
      };

      const result = parsedToolCallToMCPTool(parsedCall);
      expect(result).toEqual({
        serverName: 'fs',
        name: 'readFile',
        description: '',
        parameters: {}
      });
    });

    test('should include description and parameters if provided', () => {
      const parsedCall: ParsedToolCall = {
        serverName: 'fs',
        methodName: 'readFile',
        arguments: {
          path: '/path/to/file'
        },
        fullName: 'fs.readFile'
      };

      const parameters = {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file'
          }
        }
      };

      const result = parsedToolCallToMCPTool(
        parsedCall, 
        'Read a file from the filesystem',
        parameters
      );

      expect(result).toEqual({
        serverName: 'fs',
        name: 'readFile',
        description: 'Read a file from the filesystem',
        parameters
      });
    });
  });

  describe('mcpToolToParsedToolCall', () => {
    test('should convert an MCP Tool to a ParsedToolCall', () => {
      const mcpTool = {
        serverName: 'fs',
        name: 'readFile',
        description: 'Read a file from the filesystem',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file'
            }
          }
        }
      } as MCPToolWithServer;

      const args = {
        path: '/path/to/file'
      };

      const result = mcpToolToParsedToolCall(mcpTool, args);
      expect(result).toEqual({
        serverName: 'fs',
        methodName: 'readFile',
        arguments: args,
        fullName: 'fs.readFile'
      });
    });

    test('should use empty arguments object if not provided', () => {
      const mcpTool = {
        serverName: 'fs',
        name: 'readFile',
        description: 'Read a file from the filesystem',
        parameters: {}
      } as MCPToolWithServer;

      const result = mcpToolToParsedToolCall(mcpTool);
      expect(result.arguments).toEqual({});
    });
  });

  describe('createParsedToolCall', () => {
    test('should create a ParsedToolCall from a ToolCall', () => {
      const toolCall: ToolCall = {
        name: 'fs.readFile',
        arguments: {
          path: '/path/to/file'
        }
      };

      const result = createParsedToolCall(toolCall);
      expect(result).toEqual({
        serverName: 'fs',
        methodName: 'readFile',
        arguments: {
          path: '/path/to/file'
        },
        fullName: 'fs.readFile'
      });
    });

    test('should throw for invalid tool name format', () => {
      const toolCall: ToolCall = {
        name: 'invalidFormat',
        arguments: {
          path: '/path/to/file'
        }
      };

      expect(() => createParsedToolCall(toolCall)).toThrow(
        'Invalid tool name format: invalidFormat'
      );
    });
  });
});
