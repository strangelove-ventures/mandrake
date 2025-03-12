import { describe, test, expect } from 'bun:test';
import { ToolParsingError, ToolParsingErrorType } from '../../src/tools/types';

describe('Tool Types', () => {
  test('ToolParsingError should be correctly instantiated', () => {
    const error = new ToolParsingError(
      'Test error message',
      ToolParsingErrorType.MALFORMED_JSON,
      { test: 'data' }
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ToolParsingError);
    expect(error.message).toBe('Test error message');
    expect(error.type).toBe(ToolParsingErrorType.MALFORMED_JSON);
    expect(error.data).toEqual({ test: 'data' });
    expect(error.name).toBe('ToolParsingError');
  });

  test('ToolParsingError should work without data', () => {
    const error = new ToolParsingError(
      'Test error message',
      ToolParsingErrorType.INVALID_TOOL_CALL
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Test error message');
    expect(error.type).toBe(ToolParsingErrorType.INVALID_TOOL_CALL);
    expect(error.data).toBeUndefined();
  });
});
