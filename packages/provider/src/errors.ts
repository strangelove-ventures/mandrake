import type { 
  IProviderError, 
  INetworkError, 
  ITokenLimitError, 
  IRateLimitError 
} from '@mandrake/utils';

// Implementation of the error interfaces
export class ProviderError extends Error implements IProviderError {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class NetworkError extends ProviderError implements INetworkError {
  name = 'NetworkError' as const;
  
  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

export class TokenLimitError extends ProviderError implements ITokenLimitError {
  name = 'TokenLimitError' as const;
  
  constructor(message: string) {
    super(message);
  }
}

export class RateLimitError extends ProviderError implements IRateLimitError {
  name = 'RateLimitError' as const;
  
  constructor(message: string) {
    super(message);
  }
}