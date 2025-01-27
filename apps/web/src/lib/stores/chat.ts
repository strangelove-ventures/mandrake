'use client'
import { create } from 'zustand'
import { Session, Round, Turn } from '@mandrake/types'

interface ChatState {
    // Core session state
    session: Session | null

    // Streaming state
    isStreaming: boolean
    streamingTurns: Turn[]
    pendingRoundId: string | null
    userInput: string | null
    currentResponse: string

    // UI state
    input: string
    isLoading: boolean
    eventSource: EventSource | null

    // Actions
    setInput: (input: string) => void
    connectSession: (sessionId: string) => Promise<void>
    startNewSession: () => void
    sendMessage: (message: string) => Promise<void>
    handleSessionUpdate: (session: Session) => void
    disconnectSession: () => void
}

export const useChatStore = create<ChatState>()((set, get) => ({
    // Initial state
    session: null,
    isStreaming: false,
    streamingTurns: [],
    pendingRoundId: null,
    userInput: null,
    input: '',
    isLoading: false,
    currentResponse: '',
    eventSource: null,

    setInput: (input) => set({ input }),

    connectSession: async (sessionId: string) => {
        try {
            console.log('Connecting to session:', sessionId)
            const response = await fetch(`/api/chat/${sessionId}`)
            const session = await response.json()
            set({ session })

            console.log('Setting up EventSource')
            const es = new EventSource(`/api/chat/${sessionId}/stream`)

            es.onopen = () => {
                console.log('EventSource connected')
            }

            es.onmessage = (event) => {
                console.log('Received SSE message:', event.data)
                try {
                    const update = JSON.parse(event.data)
                    if (update.type === 'init') {
                        console.log('Received init state')
                        set({ session: update.data })
                    } else if (update.type === 'update') {
                        console.log('Received session update')
                        set({ session: update.data })
                    } else if (update.type === 'chunk') {
                        console.log('Received chunk')
                        set(state => ({
                            currentResponse: state.currentResponse + update.content,
                            streamingTurns: [
                                ...state.streamingTurns,
                                {
                                    id: `streaming-${state.streamingTurns.length}`,
                                    responseId: 'streaming',
                                    index: state.streamingTurns.length,
                                    type: 'text',
                                    content: update.content
                                }
                            ]
                        }))
                    }
                } catch (error) {
                    console.error('Error processing SSE message:', error)
                }
            }

            es.onerror = (error) => {
                console.error('EventSource error:', {
                    error,
                    readyState: es.readyState,
                    CONNECTING: EventSource.CONNECTING,
                    OPEN: EventSource.OPEN,
                    CLOSED: EventSource.CLOSED
                })
                if (es.readyState === EventSource.CLOSED) {
                    console.log('EventSource connection closed')
                }
                es.close()
            }

            set({ eventSource: es })
        } catch (error) {
            console.error('Session connection error:', error)
        }
    },

    disconnectSession: () => {
        const { eventSource } = get()
        if (eventSource) {
            eventSource.close()
            set({ eventSource: null })
        }
    },

    startNewSession: () => {
        set({
            session: null,
            streamingTurns: [],
            pendingRoundId: null,
            userInput: null,
            currentResponse: ''
        })
    },

    sendMessage: async (message: string) => {
        const { session } = get()

        set({
            isLoading: true,
            userInput: message,
            pendingRoundId: `pending-${Date.now()}`,
            currentResponse: '',
            streamingTurns: []
        })

        try {
            const response = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    sessionId: session?.id
                })
            })

            if (!response.ok || !response.body) {
                throw new Error('Stream response not ok')
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { value, done } = await reader.read()
                if (done) break

                // Decode and buffer the chunk
                buffer += decoder.decode(value)

                // Find any complete JSON objects
                let startIdx = buffer.indexOf('{')
                let endIdx = buffer.indexOf('}', startIdx)

                while (startIdx !== -1 && endIdx !== -1) {
                    const jsonStr = buffer.slice(startIdx, endIdx + 1)
                    try {
                        const update = JSON.parse(jsonStr)
                        if (update.type === 'text') {
                            set(state => ({
                                streamingTurns: [
                                    ...state.streamingTurns,
                                    {
                                        id: `streaming-${state.streamingTurns.length}`,
                                        responseId: 'streaming',
                                        index: state.streamingTurns.length,
                                        type: 'text',
                                        content: update.content
                                    }
                                ]
                            }))
                        }
                    } catch (e) {
                        console.error('Error parsing JSON:', e)
                    }

                    // Move past this object
                    buffer = buffer.slice(endIdx + 1)
                    startIdx = buffer.indexOf('{')
                    endIdx = buffer.indexOf('}', startIdx)
                }
            }
        } catch (error) {
            console.error('Error in chat stream:', error)
        } finally {
            set({ isLoading: false })
        }
    },
    
    handleSessionUpdate: (session: Session) => {
        set({ session })
    }
}))