import { NextRequest } from 'next/server';
import { z } from 'zod';

/**
 * Type definition for route factory options
 */
export interface RouteFactoryOptions {
    workspace?: string;
}

/**
 * Type definition for route factory function
 */
export type RouteFactory = (opts?: RouteFactoryOptions) => {
    GET: (req: NextRequest, context: { params?: Record<string, string> }) => Promise<Response>;
    POST: (req: NextRequest, context: { params?: Record<string, string> }) => Promise<Response>;
    PUT?: (req: NextRequest, context: { params?: Record<string, string> }) => Promise<Response>;
    DELETE?: (req: NextRequest, context: { params?: Record<string, string> }) => Promise<Response>;
};

/**
 * Session schemas for validation
 */
export const sessionCreateSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    metadata: z.record(z.string()).optional()
});

export const sessionUpdateSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    metadata: z.record(z.string()).optional()
});

export const messageCreateSchema = z.object({
    content: z.string().min(1, "Message content is required")
});

export type SessionCreateInput = z.infer<typeof sessionCreateSchema>;
export type SessionUpdateInput = z.infer<typeof sessionUpdateSchema>;
export type MessageCreateInput = z.infer<typeof messageCreateSchema>;