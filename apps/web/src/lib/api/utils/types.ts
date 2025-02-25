import { NextRequest } from 'next/server';
import { z } from 'zod';

/**
 * Common API route handler function signature
 */
export type ApiRouteHandler = (
  req: NextRequest,
  context: { params: Record<string, string | string[]> }
) => Promise<Response>;

/**
 * API route handler methods object
 */
export interface ApiRouteMethods {
  GET?: ApiRouteHandler;
  POST?: ApiRouteHandler;
  PUT?: ApiRouteHandler;
  PATCH?: ApiRouteHandler;
  DELETE?: ApiRouteHandler;
}

/**
 * Common pagination parameters schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(20),
});

/**
 * Common sorting parameters schema
 */
export const sortingSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

/**
 * Common filter parameters schema
 */
export const filterSchema = z.object({
  search: z.string().optional(),
  filters: z.record(z.string()).optional(),
});

/**
 * Common API response pagination metadata
 */
export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Resource identifier schema
 */
export const resourceIdSchema = z.object({
  id: z.string().min(1, "Resource ID is required")
});

/**
 * Workspace identifier schema
 */
export const workspaceIdSchema = z.object({
  id: z.string().min(1, "Workspace ID is required")
});

/**
 * Tool server identifier schema
 */
export const serverNameSchema = z.object({
  serverName: z.string().min(1, "Server name is required")
});

/**
 * Method name schema
 */
export const methodNameSchema = z.object({
  methodName: z.string().min(1, "Method name is required")
});

/**
 * Session identifier schema
 */
export const sessionIdSchema = z.object({
  id: z.string().min(1, "Session ID is required")
});