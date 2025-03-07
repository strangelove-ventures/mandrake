/**
 * Common types used across the API
 */

/**
 * Standard error response format
 */
export interface ErrorResponse {
  /** Error message */
  error: string;
  /** HTTP status code */
  status?: number;
}

/**
 * Standard success response format
 */
export interface SuccessResponse {
  /** Indicates operation succeeded */
  success: true;
  /** Optional message */
  message?: string;
}

/**
 * Standard deletion success response
 */
export interface DeleteResponse extends SuccessResponse {
  /** ID of the deleted resource */
  id: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  /** Page number (1-based) */
  page?: number;
  /** Items per page */
  limit?: number;
}

/**
 * Pagination metadata in responses
 */
export interface PaginationMeta {
  /** Current page number */
  page: number;
  /** Items per page */
  limit: number;
  /** Total items available */
  total: number;
  /** Total pages available */
  pages: number;
}

/**
 * Paginated response envelope
 */
export interface PaginatedResponse<T> {
  /** Items for current page */
  items: T[];
  /** Pagination metadata */
  pagination: PaginationMeta;
}