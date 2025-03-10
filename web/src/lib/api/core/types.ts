/**
 * Core API client types
 */

// Re-export types from utils package
export * from '@mandrake/utils/dist/types/api';

/**
 * API client configuration options
 */
export interface ApiClientOptions {
  /** Base URL for API requests (defaults to '/api') */
  baseUrl?: string;
  /** Default headers to include with all requests */
  defaultHeaders?: Record<string, string>;
}

/**
 * Fetch options for API requests
 */
export interface FetchOptions {
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Request body */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any;
  /** Request headers */
  headers?: HeadersInit;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}