import { expect, test, describe } from 'bun:test';
import { RipperError, ErrorCode, toRipperError } from '../../src/utils/errors';

describe('Error Utilities', () => {
  describe('RipperError', () => {
    test('creates error with code and message', () => {
      const error = new RipperError('test error', ErrorCode.IO_ERROR);
      expect(error.message).toBe('test error');
      expect(error.code).toBe(ErrorCode.IO_ERROR);
      expect(error.name).toBe('RipperError');
    });

    test('preserves cause error', () => {
      const cause = new Error('original error');
      const error = new RipperError('test error', ErrorCode.IO_ERROR, cause);
      expect(error.cause).toBe(cause);
    });
  });

  describe('toRipperError', () => {
    test('passes through RipperError', () => {
      const original = new RipperError('test', ErrorCode.IO_ERROR);
      const converted = toRipperError(original);
      expect(converted).toBe(original);
    });

    test('converts Error to RipperError', () => {
      const error = new Error('test error');
      const converted = toRipperError(error);
      expect(converted).toBeInstanceOf(RipperError);
      expect(converted.message).toBe('test error');
      expect(converted.code).toBe(ErrorCode.IO_ERROR);
      expect(converted.cause).toBe(error);
    });

    test('converts string to RipperError', () => {
      const converted = toRipperError('test error');
      expect(converted).toBeInstanceOf(RipperError);
      expect(converted.message).toBe('test error');
      expect(converted.code).toBe(ErrorCode.IO_ERROR);
      expect(converted.cause).toBeUndefined();
    });

    test('uses provided default code', () => {
      const converted = toRipperError('test', ErrorCode.COMMAND_ERROR);
      expect(converted.code).toBe(ErrorCode.COMMAND_ERROR);
    });
  });
});