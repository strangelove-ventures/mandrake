import { describe, test, expect } from 'bun:test';
import {
  formatToolCall,
  formatToolResult,
  formatToolError,
  formatToolCallAndResult,
  formatToolCallMarkdown,
  formatToolResultMarkdown
} from '../../src/tools/formatter';
import { ParsedToolCall } from '../../src/tools/types';

describe('Tool Formatter', () => {
  const sampleParsedCall: ParsedToolCall = {
    serverName: 'fs',
    methodName: 'readFile',
    arguments: {
      path: '/path/to/file'
    },
    fullName: 'fs.readFile'
  };

  describe('formatToolCall', () => {
    test('should format a tool call correctly', () => {
      const result = formatToolCall(sampleParsedCall);
      const expected = JSON.stringify({
        name: 'fs.readFile',
        arguments: {
          path: '/path/to/file'
        }
      }, null, 2);

      expect(result).toBe(expected);
    });

    test('should handle empty arguments', () => {
      const parsedCall: ParsedToolCall = {
        ...sampleParsedCall,
        arguments: {}
      };

      const result = formatToolCall(parsedCall);
      const expected = JSON.stringify({
        name: 'fs.readFile',
        arguments: {}
      }, null, 2);

      expect(result).toBe(expected);
    });
  });

  describe('formatToolResult', () => {
    test('should format a successful tool result', () => {
      const result = formatToolResult(sampleParsedCall, 'File content here');
      const expected = JSON.stringify({
        name: 'fs.readFile',
        content: 'File content here'
      }, null, 2);

      expect(result).toBe(expected);
    });

    test('should handle complex result objects', () => {
      const complexResult = {
        content: 'File content',
        metadata: {
          size: 123,
          lastModified: '2023-01-01'
        }
      };

      const result = formatToolResult(sampleParsedCall, complexResult);
      const expected = JSON.stringify({
        name: 'fs.readFile',
        content: complexResult
      }, null, 2);

      expect(result).toBe(expected);
    });

    test('should handle null result', () => {
      const result = formatToolResult(sampleParsedCall, null);
      const expected = JSON.stringify({
        name: 'fs.readFile',
        content: null
      }, null, 2);

      expect(result).toBe(expected);
    });
  });

  describe('formatToolError', () => {
    test('should format an error result with Error object', () => {
      const error = new Error('File not found');
      const result = formatToolError(sampleParsedCall, error);
      const expected = JSON.stringify({
        name: 'fs.readFile',
        error: 'File not found'
      }, null, 2);

      expect(result).toBe(expected);
    });

    test('should format an error result with string', () => {
      const result = formatToolError(sampleParsedCall, 'Permission denied');
      const expected = JSON.stringify({
        name: 'fs.readFile',
        error: 'Permission denied'
      }, null, 2);

      expect(result).toBe(expected);
    });

    test('should handle non-string/non-Error error values', () => {
      const result = formatToolError(sampleParsedCall, { code: 404, message: 'Not found' });
      const expected = JSON.stringify({
        name: 'fs.readFile',
        error: '[object Object]'
      }, null, 2);

      expect(result).toBe(expected);
    });
  });

  describe('formatToolCallAndResult', () => {
    test('should format a tool call and successful result', () => {
      const result = formatToolCallAndResult(sampleParsedCall, 'File content here');
      
      const toolCallStr = formatToolCall(sampleParsedCall);
      const resultStr = formatToolResult(sampleParsedCall, 'File content here');
      const expected = `${toolCallStr}\n\n${resultStr}`;

      expect(result).toBe(expected);
    });

    test('should format a tool call and error result', () => {
      const error = new Error('File not found');
      const result = formatToolCallAndResult(sampleParsedCall, error, true);
      
      const toolCallStr = formatToolCall(sampleParsedCall);
      const resultStr = formatToolError(sampleParsedCall, error);
      const expected = `${toolCallStr}\n\n${resultStr}`;

      expect(result).toBe(expected);
    });
  });

  describe('formatToolCallMarkdown', () => {
    test('should format a tool call as markdown', () => {
      const result = formatToolCallMarkdown(sampleParsedCall);
      const expected = `**Tool Call:** \`fs.readFile\`
  
\`\`\`json
${JSON.stringify(sampleParsedCall.arguments, null, 2)}
\`\`\``;

      expect(result).toBe(expected);
    });
  });

  describe('formatToolResultMarkdown', () => {
    test('should format a successful tool result as markdown', () => {
      const content = 'File content here';
      const result = formatToolResultMarkdown(sampleParsedCall, content);
      const expected = `**Tool Result:** \`fs.readFile\`
  
\`\`\`json
"File content here"
\`\`\``;

      expect(result).toBe(expected);
    });

    test('should format an error tool result as markdown', () => {
      const error = 'File not found';
      const result = formatToolResultMarkdown(sampleParsedCall, error, true);
      const expected = `**Tool Error:** \`fs.readFile\`
  
\`\`\`json
"File not found"
\`\`\``;

      expect(result).toBe(expected);
    });

    test('should handle complex result objects', () => {
      const complexResult = {
        content: 'File content',
        metadata: {
          size: 123,
          lastModified: '2023-01-01'
        }
      };

      const result = formatToolResultMarkdown(sampleParsedCall, complexResult);
      const expected = `**Tool Result:** \`fs.readFile\`
  
\`\`\`json
${JSON.stringify(complexResult, null, 2)}
\`\`\``;

      expect(result).toBe(expected);
    });
  });
});
