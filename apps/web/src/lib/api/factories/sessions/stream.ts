// /apps/web/src/lib/api/factories/sessions/stream.ts
import { NextRequest } from 'next/server';
import { validateBody } from '../../middleware/validation';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiStreamResponse } from '../../utils/response';
import {
    getSessionCoordinatorForRequest,
    getWorkspaceManagerForRequest
} from '@/lib/services/helpers';
import { messageCreateSchema, type MessageCreateInput } from './types';

/**
 * Stream a response from a session
 */
export async function streamSession(
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

            // Create a ReadableStream for the SSE response
            const stream = new ReadableStream({
                async start(controller) {
                    try {
                        // Function to send SSE data
                        function sendEvent(data: any) {
                            controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
                        }

                        // Initialize with starting event
                        sendEvent({ type: 'start', sessionId });

                        // Get the session coordinator to handle the message
                        const sessionCoordinator = await getSessionCoordinatorForRequest(workspaceId!, sessionId);

                        // Create a promise to track when the session coordinator is done processing
                        let processingComplete = false;
                        const processingPromise = (async () => {
                            try {
                                // Process the message (this will create a new round with request and response)
                                await sessionCoordinator.handleRequest(sessionId, body.content);
                                processingComplete = true;

                                // Send a completion event
                                sendEvent({ type: 'complete', sessionId });

                                // Close the stream
                                controller.close();
                            } catch (error) {
                                // Send an error event
                                sendEvent({
                                    type: 'error',
                                    error: error instanceof Error ? error.message : String(error)
                                });

                                // Close the stream
                                controller.close();
                            }
                        })();

                        // Get the session manager to track streaming turns
                        const sessionManager = workspaceManager.sessions;

                        // Find the latest round to get its response ID
                        let rounds = await sessionManager.listRounds(sessionId);

                        // If no rounds exist yet, wait a bit and try again
                        if (rounds.length === 0) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                            rounds = await sessionManager.listRounds(sessionId);

                            // If still no rounds, abort
                            if (rounds.length === 0) {
                                sendEvent({
                                    type: 'error',
                                    error: 'No conversation rounds found'
                                });
                                controller.close();
                                return;
                            }
                        }

                        // Get the latest round (highest index)
                        const latestRound = rounds.reduce((latest, round) =>
                            !latest || round.index > latest.index ? round : latest
                            , rounds[0]);

                        // Set up streaming for turns in the latest response
                        const stopTracking = sessionManager.trackStreamingTurns(
                            latestRound.responseId,
                            (turn) => {
                                // Send the turn update to the client
                                sendEvent({
                                    type: 'update',
                                    turn: {
                                        id: turn.id,
                                        index: turn.index,
                                        content: turn.content,
                                        status: turn.status,
                                        toolCalls: JSON.parse(turn.toolCalls), // Parse the JSON string for the client
                                        responseId: turn.responseId
                                    }
                                });

                                // If the turn is completed, check if all turns are complete
                                if (turn.status === 'completed' || turn.status === 'error') {
                                    sessionManager.getStreamingStatus(latestRound.responseId)
                                        .then(({ isComplete }) => {
                                            if (isComplete && processingComplete) {
                                                // All turns are done and processing is complete, so we can stop tracking
                                                stopTracking();
                                            }
                                        })
                                        .catch(error => {
                                            console.error('Error checking streaming status:', error);
                                        });
                                }
                            }
                        );

                        // When the processing promise resolves, the stream will be closed
                        await processingPromise;
                    } catch (error) {
                        // Log the error
                        console.error('Error in stream controller:', error);

                        // Send an error event
                        controller.enqueue(
                            `data: ${JSON.stringify({
                                type: 'error',
                                error: error instanceof Error ? error.message : String(error)
                            })}\n\n`
                        );

                        // Close the stream
                        controller.close();
                    }
                }
            });

            return createApiStreamResponse(stream);
        } catch (error) {
            // If it's not an ApiError already, wrap it
            if (!(error instanceof ApiError)) {
                throw new ApiError(
                    `Failed to stream session: ${error instanceof Error ? error.message : String(error)}`,
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
                `Failed to stream session: ${error instanceof Error ? error.message : String(error)}`,
                ErrorCode.INTERNAL_ERROR,
                500,
                error instanceof Error ? error : undefined
            );
        }
        throw error;
    }
}