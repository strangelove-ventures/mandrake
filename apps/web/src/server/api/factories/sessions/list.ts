import { NextRequest } from 'next/server';
import { SessionManager } from '@mandrake/workspace';
import { z } from 'zod';
import { validateQuery } from '../../middleware/validation';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import { getWorkspaceManagerForRequest, getManagerFromMandrake } from '@/server/services/helpers';

// Query parameters schema for pagination
const listSessionsQuerySchema = z.object({
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
});

/**
 * List all sessions
 */
export async function listSessions(
    req: NextRequest,
    opts: { workspace?: string } = {}
): Promise<Response> {
    try {
        // Validate query parameters
        const query = validateQuery(req, listSessionsQuerySchema);

        // Get the appropriate session manager
        let sessionManager;

        if (opts.workspace) {
            // For workspace-scoped routes, get the workspace manager
            const workspace = await getWorkspaceManagerForRequest(opts.workspace);
            sessionManager = workspace.sessions;
        } else {
            // For system-level routes, get the manager directly from Mandrake
            // Note: This might not be implemented yet in the backend
            try {
                const mandrakeManager = await getManagerFromMandrake('sessions');
                sessionManager = mandrakeManager;
            } catch (error) {
                throw new ApiError(
                    'System-level sessions are not yet supported',
                    ErrorCode.NOT_IMPLEMENTED,
                    501
                );
            }
        }

        // List sessions with pagination
        const sessions = await (sessionManager as SessionManager).listSessions({
            limit: query.limit,
            offset: query.offset
        });

        return createApiResponse(sessions);
    } catch (error) {
        if (!(error instanceof ApiError)) {
            throw new ApiError(
                `Failed to list sessions: ${error instanceof Error ? error.message : String(error)}`,
                ErrorCode.INTERNAL_ERROR,
                500,
                error instanceof Error ? error : undefined
            );
        }
        throw error;
    }
}