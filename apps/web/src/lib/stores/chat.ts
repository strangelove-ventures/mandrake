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

    // UI state
    input: string
    isLoading: boolean
    eventSource: EventSource | null

    // Actions
    setInput: (input: string) => void
    connectSession: (sessionId: string) => Promise<void>

    startNewSession: () => void
    sendMessage: (message: string) => Promise<void>
    handleLLMChunk: (chunk: string) => void
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

    // Actions
    eventSource: null,

    setInput: (input) => set({ input }),

    connectSession: async (sessionId: string) => {
        try {
            const response = await fetch(`/api/chat/${sessionId}`)
            const session = await response.json()
            set({ session })

            const es = new EventSource(`/api/chat/${sessionId}/stream`)

            es.onmessage = (event) => {
                const update = JSON.parse(event.data)
                if (update.type === 'init') {
                    set({ session: update.data })
                } else if (update.type === 'update') {
                    set({ session: update.data })
                }
            }

            es.onerror = (error) => {
                console.error('Session stream error:', error)
                es.close()
            }

            set({ eventSource: es })
        } catch (error) {
            console.error('Error connecting to session:', error)
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
            userInput: null
        })
    },

    sendMessage: async (message: string) => {
        const { session } = get()

        // Set pending state
        set({
            isLoading: true,
            userInput: message,
            pendingRoundId: `pending-${Date.now()}`,
            streamingTurns: []
        })

        try {
            console.log('Sending message:', message)
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

            console.log('Stream connected')
            const reader = response.body.getReader()
            const decoder = new TextDecoder()

            // Process stream
            while (true) {
                const { value, done } = await reader.read()
                if (done) { 
                    console.log('Stream complete')
                    break 
                }

                const chunk = decoder.decode(value)
                console.log('Raw chunk:', chunk)

                const lines = chunk.split('\n').filter(Boolean)
                console.log('Processing lines:', lines)

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line)
                        console.log('Parsed chunk data:', data)

                        if (data.type === 'chunk') {
                            set((state) => {
                                console.log('Current turns:', state.streamingTurns)
                                const newTurns = [
                                    ...state.streamingTurns,
                                    {
                                        id: `streaming-${state.streamingTurns.length}`,
                                        responseId: 'streaming',
                                        index: state.streamingTurns.length,
                                        type: 'text',
                                        content: data.content
                                    }
                                ]
                                console.log('New turns:', newTurns)
                                return { streamingTurns: newTurns }
                            })
                        }
                    } catch (error) {
                        console.error('Error handling line:', line, error)
                    }
                }

                get().handleLLMChunk(chunk)
            }

        } catch (error) {
            console.error('Error in chat stream:', error)
        } finally {
            console.log('Stream finished, cleaning up')
            set({ isLoading: false })
        }
    },

    handleLLMChunk: (chunk: string) => {
        const lines = chunk.split('\n').filter(Boolean)

        for (const line of lines) {
            try {
                const data = JSON.parse(line)

                if (data.type === 'chunk') {
                    set((state) => ({
                        streamingTurns: [
                            ...state.streamingTurns,
                            {
                                id: `streaming-${state.streamingTurns.length}`,
                                responseId: 'streaming',
                                index: state.streamingTurns.length,
                                type: 'text',
                                content: data.content
                            }
                        ]
                    }))
                }
            } catch (error) {
                console.error('Error handling chunk:', error)
            }
        }
    },

    handleSessionUpdate: (session: Session) => {
        set({ session })
    }
}))