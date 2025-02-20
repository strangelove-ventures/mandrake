export enum ErrorCode {
  INVALID_PATH = 'INVALID_PATH',
  ACCESS_DENIED = 'ACCESS_DENIED',
  IO_ERROR = 'IO_ERROR',
  COMMAND_ERROR = 'COMMAND_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

export class RipperError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public cause?: Error
  ) {
    super(message);
    this.name = 'RipperError';

    // Preserve stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RipperError);
    }
  }
}

export function toRipperError(error: unknown, defaultCode = ErrorCode.IO_ERROR): RipperError {
  if (error instanceof RipperError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  return new RipperError(message, defaultCode, error instanceof Error ? error : undefined);
}
