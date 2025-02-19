export class SessionError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'SessionError';
  }
}

export class ContextBuildError extends SessionError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'ContextBuildError';
  }
}

export class ProviderError extends SessionError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'ProviderError';
  }
}

export class MessageProcessError extends SessionError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'MessageProcessError';
  }
}

export class ToolCallError extends SessionError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'ToolCallError';
  }
}