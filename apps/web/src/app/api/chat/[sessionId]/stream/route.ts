// apps/web/src/app/api/chat/[sessionId]/stream/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@mandrake/storage'
import { sessionNotifier } from '@mandrake/storage'

export async function GET(
    req: NextRequest,
    { params }: { params: { sessionId: string } }
) {
    const { sessionId } = params

    return new Response(
        new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder()
                const send = (data: any) => {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
                    )
                }

                try {
                    // Send initial state
                    const initial = await prisma.session.findUnique({
                        where: { id: sessionId },
                        include: {
                            rounds: {
                                include: {
                                    request: true,
                                    response: {
                                        include: {
                                            turns: {
                                                orderBy: { index: 'asc' }
                                            }
                                        }
                                    }
                                },
                                orderBy: { index: 'asc' }
                            }
                        }
                    })
                    send({ type: 'init', data: initial })

                    // Subscribe to updates
                    const unsubscribe = sessionNotifier.subscribe(sessionId, (session) => {
                        send({ type: 'update', data: session })
                    })

                    // Cleanup on disconnect
                    req.signal.addEventListener('abort', () => {
                        unsubscribe()
                    })
                } catch (error) {
                    console.error('Session stream error:', error)
                    controller.error(error)
                }
            }
        }),
        {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            }
        }
    )
}