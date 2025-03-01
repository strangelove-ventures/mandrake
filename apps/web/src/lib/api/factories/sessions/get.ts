import { SessionManager } from '@mandrake/workspace';
import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import { getWorkspaceManagerForRequest, getManagerFromMandrake } from '@/lib/services/helpers';

/**
 * Get a specific session by ID
 */
export async function getSession(
    req: NextRequest,
    sessionId: string,
    opts: { workspace?: string } = {}
): Promise<Response> {
    try {
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

        // Get the session
        try {
            const session = await (sessionManager as SessionManager).getSession(sessionId);

            // Render full session history with rounds, requests, responses, and turns
            const sessionWithHistory = await (sessionManager as SessionManager).renderSessionHistory(sessionId);

            return createApiResponse(sessionWithHistory);
        } catch (error) {
            // Handle specific error for session not found
            if (error instanceof Error && error.message.includes('not found')) {
                throw new ApiError(
                    `Session not found: ${sessionId}`,
                    ErrorCode.RESOURCE_NOT_FOUND,
                    404
                );
            }
            throw error;
        }
    } catch (error) {
        if (!(error instanceof ApiError)) {
            throw new ApiError(
                `Failed to get session: ${error instanceof Error ? error.message : String(error)}`,
                ErrorCode.INTERNAL_ERROR,
                500,
                error instanceof Error ? error : undefined
            );
        }
        throw error;
    }
}