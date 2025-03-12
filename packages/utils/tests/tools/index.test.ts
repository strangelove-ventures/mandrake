import { describe, test, expect } from 'bun:test';
import * as toolsModule from '../../src/tools';

describe('Tools Module Exports', () => {
  test('should export all types', () => {
    expect(toolsModule).toHaveProperty('ToolParsingErrorType');
    expect(toolsModule).toHaveProperty('ToolParsingError');
  });

  test('should export all parser functions', () => {
    expect(typeof toolsModule.parseToolName).toBe('function');
    expect(typeof toolsModule.extractToolCalls).toBe('function');
    expect(typeof toolsModule.extractToolResults).toBe('function');
    expect(typeof toolsModule.parseToolCall).toBe('function');
    expect(typeof toolsModule.extractParsedToolCalls).toBe('function');
    expect(typeof toolsModule.extractToolCallsForDisplay).toBe('function');
  });

  test('should export all formatter functions', () => {
    expect(typeof toolsModule.formatToolCall).toBe('function');
    expect(typeof toolsModule.formatToolResult).toBe('function');
    expect(typeof toolsModule.formatToolError).toBe('function');
    expect(typeof toolsModule.formatToolCallAndResult).toBe('function');
    expect(typeof toolsModule.formatToolCallMarkdown).toBe('function');
    expect(typeof toolsModule.formatToolResultMarkdown).toBe('function');
  });

  test('should export interfaces as types', () => {
    // We can't directly test the interfaces, but we can make TypeScript 
    // recognize them by creating variables with their types
    const _toolCall: toolsModule.ToolCall = {
      name: 'test.method',
      arguments: {}
    };
    
    const _toolResult: toolsModule.ToolResult = {
      name: 'test.method',
      content: 'test'
    };
    
    const _parsedToolCall: toolsModule.ParsedToolCall = {
      serverName: 'test',
      methodName: 'method',
      arguments: {},
      fullName: 'test.method'
    };
    
    const _toolCallDisplay: toolsModule.ToolCallDisplay = {
      callType: 'request',
      serverName: 'test',
      methodName: 'method',
      data: {},
      timestamp: 123456789,
      id: 'test-id'
    };
    
    // If we reached here, TypeScript recognized the types correctly
    expect(true).toBe(true);
  });
});
