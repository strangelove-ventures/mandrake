/**
 * Base API client functionality
 */
import { ApiError } from './errors';
import { ApiClientOptions, FetchOptions } from './types';
import { ErrorResponse } from '@mandrake/utils/dist/types/api';

/**
 * Core API client that handles requests to the Mandrake API
 */
export class ApiClient {
  /** Base URL for API requests */
  private baseUrl: string;
  /** Default headers to include with all requests */
  private defaultHeaders: Record<string, string>;

  /**
   * Creates a new API client instance
   */
  constructor(options: ApiClientOptions = {}) {
    // Use provided baseUrl or environment variable or default
    // For server-side rendering, use full URL
    this.baseUrl = options.baseUrl || 
      process.env.API_BASE_URL || 
      (typeof window === 'undefined' ? 'http://localhost:4000' : '/api');
      
    this.defaultHeaders = options.defaultHeaders || {};
  }

  /**
   * Sends a request to the API and parses the JSON response
   */
  async fetchJson<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, signal } = options;
    
    // Create the full URL - ensure we don't have double slashes if endpoint starts with slash
    const url = endpoint.startsWith('/') 
      ? `${this.baseUrl}${endpoint}` 
      : `${this.baseUrl}/${endpoint}`;
    
    console.log(`API Request: ${method} ${url}`);
    
    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.defaultHeaders,
        ...headers,
      },
      signal,
    };
    
    // Add body if provided
    if (body !== undefined) {
      requestOptions.body = JSON.stringify(body);
    }
    
    // Send the request
    const response = await fetch(url, requestOptions);
    
    // Get the content type
    const contentType = response.headers.get('Content-Type') || '';
    
    // Handle error responses
    if (!response.ok) {
      let errorData: ErrorResponse;
      
      try {
        // Try to parse error as JSON
        if (contentType.includes('application/json')) {
          errorData = await response.json() as ErrorResponse;
        } else {
          // Use text as error message
          const errorText = await response.text();
          errorData = { error: errorText, status: response.status };
        }
      } catch {
        // If parsing fails, use status text
        errorData = { error: response.statusText, status: response.status };
      }
      
      console.error(`API Error: ${method} ${url}`, errorData);
      throw new ApiError(response.status, errorData);
    }
    
    // Handle successful responses
    if (contentType.includes('application/json')) {
      const data = await response.json();
      console.log(`API Response: ${method} ${url}`, data);
      return data as T;
    }
    
    // No content or unexpected content type
    if (response.status === 204) {
      return {} as T;
    }
    
    throw new Error(`Unexpected content type: ${contentType}`);
  }

  /**
   * Sends a request to a streaming endpoint without expecting a JSON response
   * Used specifically for triggering streaming endpoints that return text/event-stream
   */
  async fetchStreaming(endpoint: string, options: FetchOptions = {}): Promise<void> {
    const { method = 'POST', body, headers = {}, signal } = options;
    
    // Create the full URL
    const url = endpoint.startsWith('/') 
      ? `${this.baseUrl}${endpoint}` 
      : `${this.baseUrl}/${endpoint}`;
    
    console.log(`Streaming Request: ${method} ${url}`);
    
    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.defaultHeaders,
        ...headers,
      },
      signal,
    };
    
    // Add body if provided
    if (body !== undefined) {
      requestOptions.body = JSON.stringify(body);
    }
    
    try {
      // Send the request but don't expect any particular response type
      const response = await fetch(url, requestOptions);
      
      // Only check if the response is ok
      if (!response.ok) {
        let errorData: ErrorResponse;
        try {
          // Try to parse error as JSON
          if (response.headers.get('Content-Type')?.includes('application/json')) {
            errorData = await response.json() as ErrorResponse;
          } else {
            // Use text as error message
            const errorText = await response.text();
            errorData = { error: errorText, status: response.status };
          }
        } catch {
          // If parsing fails, use status text
          errorData = { error: response.statusText, status: response.status };
        }
        
        console.error(`Streaming API Error: ${method} ${url}`, errorData);
        throw new ApiError(response.status, errorData);
      }
      
      console.log(`Streaming request sent: ${method} ${url}`);
      // Don't try to parse the response - it's being handled by EventSource
    } catch (error) {
      // Only rethrow if it's not an abort error
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        throw error;
      }
    }
  }

  /**
   * Builds a workspace-scoped URL
   */
  createUrl(path: string, workspaceId?: string): string {
    return workspaceId 
      ? `/workspaces/${workspaceId}${path.startsWith('/') ? path : `/${path}`}` 
      : path;
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient();
