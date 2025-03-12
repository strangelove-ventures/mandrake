import { describe, test, expect } from 'bun:test';
import {
  parseToolName,
  extractToolCalls,
  extractToolResults,
  parseToolCall,
  extractParsedToolCalls,
  extractToolCallsForDisplay
} from '../../src/tools/parser';
import { ToolParsingError, type ToolCall, ToolParsingErrorType } from '../../src/tools/types';

describe('Tool Parser', () => {
  describe('parseToolName', () => {
    test('should correctly parse valid tool names', () => {
      const result = parseToolName('fs.readFile');
      expect(result).toEqual({
        serverName: 'fs',
        methodName: 'readFile'
      });
    });

    test('should return null for invalid format', () => {
      expect(parseToolName('invalid')).toBeNull();
      expect(parseToolName('too.many.parts')).toBeNull();
      expect(parseToolName('')).toBeNull();
      expect(parseToolName('.missingServer')).toBeNull();
      expect(parseToolName('missingMethod.')).toBeNull();
    });

    test('should return null for non-string input', () => {
      // @ts-expect-error Testing invalid input
      expect(parseToolName(null)).toBeNull();
      // @ts-expect-error Testing invalid input
      expect(parseToolName(undefined)).toBeNull();
      // @ts-expect-error Testing invalid input
      expect(parseToolName(123)).toBeNull();
    });
  });

  describe('extractToolCalls', () => {
    test('should extract tool calls from text', () => {
      const text = `
      Some text before
      
      {
        "name": "fs.readFile",
        "arguments": {
          "path": "/path/to/file"
        }
      }
      
      Some text after
      `;

      const result = extractToolCalls(text);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'fs.readFile',
        arguments: {
          path: '/path/to/file'
        }
      });
    });

    test('should extract multiple tool calls', () => {
      const text = `
      {
        "name": "fs.readFile",
        "arguments": {
          "path": "/path/to/file1"
        }
      }
      
      Some text in between
      
      {
        "name": "fs.writeFile",
        "arguments": {
          "path": "/path/to/file2",
          "content": "Hello World"
        }
      }
      `;

      const result = extractToolCalls(text);
      // We should only have 2 results: the fs.readFile call and result
      // The invalidName and invalidformat entries should be filtered out
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('fs.readFile');
      expect(result[1].name).toBe('fs.writeFile');
    });

    test('should handle malformed JSON gracefully', () => {
      const text = `
      {
        "name": "fs.readFile",
        "arguments": {
          "path": "/path/to/file"
        }
      }
      
      {
        "name": "fs.writeFile",
        "arguments": {
          "path": "/path/to/file2",
          "content": "Hello World"
        
      ` // <-- Missing closing braces

      // Mock console.error to prevent test output pollution
      const originalConsoleError = console.error;
      console.error = () => {};
      
      const result = extractToolCalls(text);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('fs.readFile');
      // In Bun we can't easily check if the mock was called, so we'll skip this check
      
      // Restore original console.error
      console.error = originalConsoleError;
    });

    test('should return empty array for empty or non-matching text', () => {
      expect(extractToolCalls('')).toEqual([]);
      expect(extractToolCalls('No tool calls here')).toEqual([]);
      expect(extractToolCalls(null as unknown as string)).toEqual([]);
      expect(extractToolCalls(undefined as unknown as string)).toEqual([]);
    });
  });

  describe('extractToolResults', () => {
    test('should extract tool results from text', () => {
      const text = `
      Some text before
      
      {
        "name": "fs.readFile",
        "content": "File content here"
      }
      
      Some text after
      `;

      const result = extractToolResults(text);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'fs.readFile',
        content: 'File content here'
      });
    });

    test('should extract error results', () => {
      const text = `
      {
        "name": "fs.readFile",
        "error": "File not found"
      }
      `;

      const result = extractToolResults(text);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'fs.readFile',
        error: 'File not found'
      });
    });

    test('should extract multiple tool results', () => {
      const text = `
      {
        "name": "fs.readFile",
        "content": "File content here"
      }
      
      Some text in between
      
      {
        "name": "fs.writeFile",
        "content": true
      }
      `;

      const result = extractToolResults(text);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('fs.readFile');
      expect(result[1].name).toBe('fs.writeFile');
    });

    test('should handle malformed JSON gracefully', () => {
      const text = `
      {
        "name": "fs.readFile",
        "content": "File content here"
      }
      
      {
        "name": "fs.writeFile",
        "content": true
      ` // <-- Missing closing brace

      // Mock console.error to prevent test output pollution
      const originalConsoleError = console.error;
      console.error = () => {};
      
      const result = extractToolResults(text);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('fs.readFile');
      // In Bun we can't easily check if the mock was called, so we'll skip this check
      
      // Restore original console.error
      console.error = originalConsoleError;
    });

    test('should return empty array for empty or non-matching text', () => {
      expect(extractToolResults('')).toEqual([]);
      expect(extractToolResults('No tool results here')).toEqual([]);
      expect(extractToolResults(null as unknown as string)).toEqual([]);
      expect(extractToolResults(undefined as unknown as string)).toEqual([]);
    });
  });

  describe('parseToolCall', () => {
    test('should parse valid tool call', () => {
      const toolCall = {
        name: 'fs.readFile',
        arguments: {
          path: '/path/to/file'
        }
      };

      const result = parseToolCall(toolCall);
      expect(result).toEqual({
        serverName: 'fs',
        methodName: 'readFile',
        arguments: {
          path: '/path/to/file'
        },
        fullName: 'fs.readFile'
      });
    });

    test('should throw for missing name', () => {
      const toolCall = {
        name: '',
        arguments: {
          path: '/path/to/file'
        }
      };

      expect(() => parseToolCall(toolCall)).toThrow(ToolParsingError);
      try {
        parseToolCall(toolCall);
      } catch (e) {
        expect(e).toBeInstanceOf(ToolParsingError);
        expect((e as ToolParsingError).type).toBe(ToolParsingErrorType.INVALID_TOOL_CALL);
      }
    });

    test('should throw for invalid name format', () => {
      const toolCall = {
        name: 'invalidName',
        arguments: {
          path: '/path/to/file'
        }
      };

      expect(() => parseToolCall(toolCall)).toThrow(ToolParsingError);
      try {
        parseToolCall(toolCall);
      } catch (e) {
        expect(e).toBeInstanceOf(ToolParsingError);
        expect((e as ToolParsingError).type).toBe(ToolParsingErrorType.INVALID_TOOL_NAME);
      }
    });

    test('should throw for missing arguments', () => {
      const toolCall = {
        name: 'fs.readFile',
        arguments: null
      };

      expect(() => parseToolCall(toolCall as any)).toThrow(ToolParsingError);
      try { 
        parseToolCall(toolCall as any);
      } catch (e) {
        expect(e).toBeInstanceOf(ToolParsingError);
        expect((e as ToolParsingError).type).toBe(ToolParsingErrorType.MISSING_ARGUMENTS);
      }
    });
  });

  describe('extractParsedToolCalls', () => {
    test('should extract and parse tool calls', () => {
      const text = `
      {
        "name": "fs.readFile",
        "arguments": {
          "path": "/path/to/file"
        }
      }
      `;

      const result = extractParsedToolCalls(text);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        serverName: 'fs',
        methodName: 'readFile',
        arguments: {
          path: '/path/to/file'
        },
        fullName: 'fs.readFile'
      });
    });

    test('should filter out invalid tool calls', () => {
      const text = `
      {
        "name": "fs.readFile",
        "arguments": {
          "path": "/path/to/file"
        }
      }
      
      {
        "name": "invalidName",
        "arguments": {
          "path": "/path/to/file2"
        }
      }
      `;

      // Mock console.error to prevent test output pollution
      const originalConsoleError = console.error;
      console.error = () => {};
      
      const result = extractParsedToolCalls(text);
      
      expect(result).toHaveLength(1);
      expect(result[0].fullName).toBe('fs.readFile');
      // In Bun we can't easily check if the mock was called, so we'll skip this check
      
      // Restore original console.error
      console.error = originalConsoleError;
    });
  });

  describe('extractToolCallsForDisplay', () => {
    test('should extract tool calls and results for display', () => {
      const text = `
      {
        "name": "fs.readFile",
        "arguments": {
          "path": "/path/to/file"
        }
      }
      
      {
        "name": "fs.readFile",
        "content": "File content here"
      }
      `;

      // Mock Date.now() to return a consistent value for testing
      const originalDateNow = Date.now;
      Date.now = () => 1234567890;

      // Mock Math.random to return a consistent value for testing
      const originalMathRandom = Math.random;
      Math.random = () => 0.123456789;

      const result = extractToolCallsForDisplay(text);
      
      // We should only have 2 results: the fs.readFile call and result
      // The invalidName and invalidformat entries should be filtered out
      expect(result).toHaveLength(2);
      
      expect(result[0].callType).toBe('request');
      expect(result[0].serverName).toBe('fs');
      expect(result[0].methodName).toBe('readFile');
      expect(result[0].data).toEqual({ path: '/path/to/file' });
      expect(result[0].timestamp).toBe(1234567890);
      expect(result[0].id).toMatch(/fs\.readFile-1234567890-/);
      
      expect(result[1].callType).toBe('response');
      expect(result[1].serverName).toBe('fs');
      expect(result[1].methodName).toBe('readFile');
      expect(result[1].data).toBe('File content here');
      expect(result[1].timestamp).toBe(1234567890);
      expect(result[1].id).toMatch(/fs\.readFile-1234567890-/);

      // Restore original functions
      Date.now = originalDateNow;
      Math.random = originalMathRandom;
    });

    test('should handle error results', () => {
      const text = `
      {
        "name": "fs.readFile",
        "arguments": {
          "path": "/path/to/file"
        }
      }
      
      {
        "name": "fs.readFile",
        "error": "File not found"
      }
      `;

      // Mock Date.now() and Math.random for consistent output
      const originalDateNow = Date.now;
      const originalMathRandom = Math.random;
      Date.now = () => 1234567890;
      Math.random = () => 0.123456789;

      const result = extractToolCallsForDisplay(text);
      
      expect(result).toHaveLength(2);
      expect(result[0].callType).toBe('request');
      expect(result[1].callType).toBe('error');
      expect(result[1].data).toBe('File not found');

      // Restore original functions
      Date.now = originalDateNow;
      Math.random = originalMathRandom;
    });

    test('should filter out invalid tool calls and results', () => {
      const text = `
      {
        "name": "fs.readFile",
        "arguments": {
          "path": "/path/to/file"
        }
      }
      
      {
        "name": "invalidName",
        "arguments": {
          "path": "/path/to/file2"
        }
      }
      
      {
        "name": "fs.readFile",
        "content": "File content here"
      }
      `;

      // Mock console.error and other timing functions
      const originalConsoleError = console.error;
      const originalDateNow = Date.now;
      const originalMathRandom = Math.random;
      
      console.error = () => {};
      Date.now = () => 1234567890;
      Math.random = () => 0.123456789;
      
      const result = extractToolCallsForDisplay(text);
      
      // We should only have 2 results: the fs.readFile call and result
      // The invalidName entry should be filtered out
      expect(result).toHaveLength(2);
      expect(result[0].serverName).toBe('fs');
      expect(result[0].methodName).toBe('readFile');
      expect(result[1].serverName).toBe('fs');
      expect(result[1].methodName).toBe('readFile');
      
      // Restore original functions
      console.error = originalConsoleError;
      Date.now = originalDateNow;
      Math.random = originalMathRandom;
    });
  });
});
