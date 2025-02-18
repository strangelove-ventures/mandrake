export class ProviderError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class NetworkError extends ProviderError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'NetworkError';
  }
}

export class TokenLimitError extends ProviderError {
  constructor(message: string) {
    super(message);
    this.name = 'TokenLimitError';
  }
}

export class RateLimitError extends ProviderError {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}