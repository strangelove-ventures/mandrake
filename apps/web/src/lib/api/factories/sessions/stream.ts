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

                        // Get the session manager to track streaming turns
                        const sessionManager = workspaceManager.sessions;

                        // Track state
                        let processingComplete = false;
                        let allTurnsComplete = false;
                        let latestResponseId: string | null = null;
                        let trackingStarted = false;
                        let stopTrackingFn: (() => void) | null = null;

                        // Function to check if we should complete the stream
                        function checkAndCompleteStream() {
                            if (processingComplete && (allTurnsComplete || !trackingStarted)) {
                                // Send a completion event
                                sendEvent({ type: 'complete', sessionId });
                                
                                // Close the stream
                                controller.close();
                                
                                // Stop tracking if still active
                                if (stopTrackingFn) {
                                    stopTrackingFn();
                                }
                                
                                // Clean up any remaining timers
                                clearInterval(pollInterval);
                                if (timeoutId) clearTimeout(timeoutId);
                                if (completionTimeoutId) clearTimeout(completionTimeoutId);
                            }
                        }

                        // Get the session coordinator to handle the message
                        const sessionCoordinator = await getSessionCoordinatorForRequest(workspaceId!, sessionId);

                        // Create a promise to track when the session coordinator is done processing
                        const processingPromise = sessionCoordinator.handleRequest(sessionId, body.content)
                            .then(() => {
                                // Mark processing as complete, but don't close the stream yet
                                // We need to make sure all turns are properly tracked first
                                console.log('Message processing complete, waiting for turns to complete');
                                processingComplete = true;
                                
                                // Check if we should complete the stream
                                checkAndCompleteStream();
                            })
                            .catch((error: { message: any; }) => {
                                // Send an error event
                                sendEvent({
                                    type: 'error',
                                    error: error instanceof Error ? error.message : String(error)
                                });

                                // Close the stream
                                controller.close();
                            });

                        // Poll for new rounds and set up turn tracking
                        const pollInterval = setInterval(async () => {
                            try {
                                if (trackingStarted) {
                                    return;
                                }

                                // Find the latest round to get its response ID
                                const rounds = await sessionManager.listRounds(sessionId);

                                if (rounds.length > 0) {
                                    // Get the latest round (highest index)
                                    const latestRound = rounds.reduce((latest, round) =>
                                        !latest || round.index > latest.index ? round : latest
                                    , rounds[0]);

                                    if (latestRound.responseId !== latestResponseId) {
                                        latestResponseId = latestRound.responseId;
                                        
                                        // If we have a previous tracking function, stop it
                                        if (stopTrackingFn) {
                                            stopTrackingFn();
                                        }
                                        
                                        // Set up streaming for turns in the latest response
                                        trackingStarted = true;
                                        stopTrackingFn = sessionManager.trackStreamingTurns(
                                            latestRound.responseId,
                                            (turn) => {
                                                console.log('Got turn update:', turn);
                                                // Send the turn update to the client
                                                sendEvent({
                                                    type: 'update',
                                                    turn: {
                                                        id: turn.id,
                                                        index: turn.index,
                                                        content: turn.rawResponse,
                                                        status: turn.status,
                                                        toolCalls: JSON.parse(turn.toolCalls),
                                                        responseId: turn.responseId
                                                    }
                                                });

                                                // If the turn is completed, check if all turns are complete
                                                if (turn.status === 'completed' || turn.status === 'error') {
                                                    sessionManager.getStreamingStatus(latestRound.responseId)
                                                        .then(({ isComplete }) => {
                                                            if (isComplete) {
                                                                console.log('All turns complete, marking for stream end');
                                                                allTurnsComplete = true;
                                                                checkAndCompleteStream();
                                                            }
                                                        })
                                                        .catch(error => {
                                                            console.error('Error checking streaming status:', error);
                                                        });
                                                }
                                            }
                                        );

                                        // If we've started tracking, we can stop polling
                                        clearInterval(pollInterval);
                                    }
                                }
                            } catch (error) {
                                console.error('Error in polling interval:', error);
                            }
                        }, 50);

                        // Set a timeout to ensure the stream doesn't hang indefinitely
                        let timeoutId = setTimeout(() => {
                            if (!processingComplete || !allTurnsComplete) {
                                // Send a timeout error event
                                sendEvent({
                                    type: 'error',
                                    error: 'Stream timed out after 3 minutes'
                                });
                                
                                // Close the stream
                                controller.close();
                                
                                // Clean up
                                if (stopTrackingFn) {
                                    stopTrackingFn();
                                }
                                clearInterval(pollInterval);
                            }
                        }, 180000); // 3 minute timeout

                        // Set a timeout for final completion - if processing is complete but turns aren't
                        // marked complete after 8 seconds, force completion
                        let completionTimeoutId: ReturnType<typeof setTimeout> | null = null;
                        
                        // When the processing promise resolves, we'll check if we should complete the stream
                        await processingPromise;
                        
                        // If we get here and tracking never started, complete the stream
                        if (!trackingStarted) {
                            console.log('Processing completed but tracking never started, completing stream');
                            allTurnsComplete = true;
                            checkAndCompleteStream();
                        } else if (processingComplete && !allTurnsComplete) {
                            // If processing is complete but turns aren't marked complete after 8 seconds,
                            // assume they are complete and end the stream
                            console.log('Setting final completion timeout');
                            completionTimeoutId = setTimeout(() => {
                                if (!allTurnsComplete && processingComplete) {
                                    console.log('Forcing stream completion after final timeout');
                                    allTurnsComplete = true;
                                    checkAndCompleteStream();
                                }
                            }, 8000);
                        }
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