import { NextRequest } from 'next/server';
import { listSessions } from './list';
import { getSession } from './get';
import { createSession } from './create';
import { updateSession } from './update';
import { deleteSession } from './delete';
import { createMessage } from './messages';
import { streamSession } from './stream';
import { RouteFactory } from './types';

/**
 * Creates handlers for session API routes (both system and workspace-level)
 * @param opts Options including workspace ID for workspace-scoped routes
 * @returns Route handlers for different HTTP methods
 */
export const createSessionRoutes: RouteFactory = (opts = {}) => {
    const { workspace } = opts;

    return {
        /**
         * GET - List sessions or get a specific session
         */
        GET: async (
            req: NextRequest,
            { params }: { params?: { id?: string } } = {}
        ) => {
            // If ID is provided, get a specific session
            if (params?.id) {
                return getSession(req, params.id, { workspace });
            }
            // Otherwise, list all sessions
            return listSessions(req, { workspace });
        },

        /**
         * POST - Create a new session, send a message, or stream a response
         */
        POST: async (
            req: NextRequest,
            { params }: { params?: { id?: string, stream?: string, messages?: string } } = {}
        ) => {
            // Stream a session if the path includes 'stream'
            if (params?.id && params?.stream === 'stream') {
                return streamSession(req, params.id, { workspace });
            }

            // Create a message if the path includes 'messages'
            if (params?.id && params?.messages === 'messages') {
                return createMessage(req, params.id, { workspace });
            }

            // Otherwise create a new session
            return createSession(req, { workspace });
        },

        /**
         * PUT - Update a session
         */
        PUT: async (
            req: NextRequest,
            { params }: { params?: { id?: string } } = {}
        ) => {
            if (!params?.id) {
                return new Response(JSON.stringify({ error: 'Session ID is required' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            return updateSession(req, params.id, { workspace });
        },

        /**
         * DELETE - Remove a session
         */
        DELETE: async (
            req: NextRequest,
            { params }: { params?: { id?: string } } = {}
        ) => {
            if (!params?.id) {
                return new Response(JSON.stringify({ error: 'Session ID is required' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            return deleteSession(req, params.id, { workspace });
        }
    };
};
