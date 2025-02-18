export class ProviderError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'ProviderError';
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

export class NetworkError extends ProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'NetworkError';
  }
}