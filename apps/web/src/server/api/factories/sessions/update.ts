import { SessionManager } from '@mandrake/workspace';
import { NextRequest } from 'next/server';
import { validateBody } from '../../middleware/validation';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import { getWorkspaceManagerForRequest, getManagerFromMandrake } from '@/server/services/helpers';
import { sessionUpdateSchema, type SessionUpdateInput } from './types';

/**
 * Update an existing session
 */
export async function updateSession(
    req: NextRequest,
    sessionId: string,
    opts: { workspace?: string } = {}
): Promise<Response> {
    try {
        // Validate request body
        const body = await validateBody<SessionUpdateInput>(req, sessionUpdateSchema);

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

        try {
            // First check if the session exists
            await (sessionManager as SessionManager).getSession(sessionId);

            // Update the session
            const updatedSession = await (sessionManager as SessionManager).updateSession(sessionId, {
                title: body.title,
                description: body.description,
                metadata: body.metadata
            });

            return createApiResponse(updatedSession);
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
                `Failed to update session: ${error instanceof Error ? error.message : String(error)}`,
                ErrorCode.INTERNAL_ERROR,
                500,
                error instanceof Error ? error : undefined
            );
        }
        throw error;
    }
}