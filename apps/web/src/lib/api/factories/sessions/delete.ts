import { SessionManager } from '@mandrake/workspace';
import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createNoContentResponse } from '../../utils/response';
import {
    getWorkspaceManagerForRequest,
    getManagerFromMandrake,
    releaseSessionResources
} from '@/lib/services/helpers';

/**
 * Delete a session
 */
export async function deleteSession(
    req: NextRequest,
    sessionId: string,
    opts: { workspace?: string } = {}
): Promise<Response> {
    try {
        // Get the appropriate session manager
        let sessionManager;
        let workspaceId = opts.workspace;

        if (workspaceId) {
            // For workspace-scoped routes, get the workspace manager
            const workspace = await getWorkspaceManagerForRequest(workspaceId);
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

            // Delete the session
            await (sessionManager as SessionManager).deleteSession(sessionId);

            // Release session resources if this is a workspace-scoped session
            if (workspaceId) {
                await releaseSessionResources(workspaceId, sessionId);
            }

            return createNoContentResponse();
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
                `Failed to delete session: ${error instanceof Error ? error.message : String(error)}`,
                ErrorCode.INTERNAL_ERROR,
                500,
                error instanceof Error ? error : undefined
            );
        }
        throw error;
    }
}