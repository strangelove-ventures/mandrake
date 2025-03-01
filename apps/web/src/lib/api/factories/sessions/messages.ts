import { NextRequest } from 'next/server';
import { validateBody } from '../../middleware/validation';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import {
    getSessionCoordinatorForRequest,
    getWorkspaceManagerForRequest
} from '@/lib/services/helpers';
import { messageCreateSchema, type MessageCreateInput } from './types';

/**
 * Create a message in a session
 */
export async function createMessage(
    req: NextRequest,
    sessionId: string,
    opts: { workspace?: string } = {}
): Promise<Response> {
    try {
        // Validate request body
        const body = await validateBody<MessageCreateInput>(req, messageCreateSchema);

        // Get the appropriate resources
        let workspaceId = opts.workspace;

        // For system-level routes, we don't support sessions yet
        if (!workspaceId) {
            throw new ApiError(
                'System-level sessions are not yet supported',
                ErrorCode.NOT_IMPLEMENTED,
                501
            );
        }

        try {
            // First get the workspace manager to ensure the session exists
            const workspaceManager = await getWorkspaceManagerForRequest(workspaceId);

            try {
                // Verify that the session exists
                await workspaceManager.sessions.getSession(sessionId);
            } catch (error) {
                throw new ApiError(
                    `Session not found: ${sessionId}`,
                    ErrorCode.RESOURCE_NOT_FOUND,
                    404
                );
            }

            // Get the session coordinator to handle the message
            const sessionCoordinator = await getSessionCoordinatorForRequest(workspaceId, sessionId);

            // Process the message (this will create a new round with request and response)
            await sessionCoordinator.handleRequest(sessionId, body.content);

            // Get the updated session with history to return to the client
            const sessionWithHistory = await workspaceManager.sessions.renderSessionHistory(sessionId);

            return createApiResponse(sessionWithHistory);
        } catch (error) {
            // If it's not an ApiError already, wrap it
            if (!(error instanceof ApiError)) {
                throw new ApiError(
                    `Failed to create message: ${error instanceof Error ? error.message : String(error)}`,
                    ErrorCode.INTERNAL_ERROR,
                    500,
                    error instanceof Error ? error : undefined
                );
            }
            throw error;
        }
    } catch (error) {
        if (!(error instanceof ApiError)) {
            throw new ApiError(
                `Failed to create message: ${error instanceof Error ? error.message : String(error)}`,
                ErrorCode.INTERNAL_ERROR,
                500,
                error instanceof Error ? error : undefined
            );
        }
        throw error;
    }
}