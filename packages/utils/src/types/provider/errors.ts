/**
 * Error types for provider-related errors
 */

/**
 * Base error type for provider errors
 */
export interface IProviderError {
  name: string;
  message: string;
  cause?: Error;
}

/**
 * Error type for network-related errors
 */
export interface INetworkError extends IProviderError {
  name: 'NetworkError';
}

/**
 * Error type for token limit exceeded errors
 */
export interface ITokenLimitError extends IProviderError {
  name: 'TokenLimitError';
}

/**
 * Error type for rate limit exceeded errors
 */
export interface IRateLimitError extends IProviderError {
  name: 'RateLimitError';
}