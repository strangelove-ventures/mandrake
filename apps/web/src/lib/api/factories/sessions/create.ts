import { SessionManager } from '@mandrake/workspace';
import { NextRequest } from 'next/server';
import { validateBody } from '../../middleware/validation';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import { getWorkspaceManagerForRequest, getManagerFromMandrake } from '@/lib/services/helpers';
import { sessionCreateSchema, type SessionCreateInput } from './types';

/**
 * Create a new session
 */
export async function createSession(
    req: NextRequest,
    opts: { workspace?: string } = {}
): Promise<Response> {
    try {
        // Validate request body
        const body = await validateBody<SessionCreateInput>(req, sessionCreateSchema);

        // Get the appropriate session manager
        let sessionManager;

        if (opts.workspace) {
            // For workspace-scoped routes, get the workspace manager
            const workspace = await getWorkspaceManagerForRequest(opts.workspace);
            sessionManager = workspace.sessions;
        } else {
            // For system-level routes, get the manager directly from Mandrake
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

        // Create the session
        try {
            const session = await (sessionManager as SessionManager).createSession({
                title: body.title,
                description: body.description,
                metadata: body.metadata
            });

            return createApiResponse(session, 201);
        } catch (error) {
            throw new ApiError(
                `Failed to create session: ${error instanceof Error ? error.message : String(error)}`,
                ErrorCode.INTERNAL_ERROR,
                500,
                error instanceof Error ? error : undefined
            );
        }
    } catch (error) {
        if (!(error instanceof ApiError)) {
            throw new ApiError(
                `Failed to create session: ${error instanceof Error ? error.message : String(error)}`,
                ErrorCode.INTERNAL_ERROR,
                500,
                error instanceof Error ? error : undefined
            );
        }
        throw error;
    }
}