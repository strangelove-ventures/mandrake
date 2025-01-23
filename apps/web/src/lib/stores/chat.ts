// /lib/stores/chat.ts
import { create } from 'zustand'
import { MandrakeChat } from '../mandrake-chat'
import { StreamProcessor } from '../chat-state'
import { Session, Round, Turn } from '@mandrake/types'

interface ChatState {
    // Session state
    sessions: Session[]
    currentSession: Session | null
    currentRounds: Round[]

    // Stream state 
    isStreaming: boolean
    streamingContent: Turn[] // Now using the same Turn type
    currentToolCall: Turn | null // Consistent type usage

    // UI state
    input: string
    isLoading: boolean
    userInput: string

    // Actions
    setInput: (input: string) => void
    fetchSessions: () => Promise<void>
    loadSession: (id: string) => Promise<void>
    startNewSession: () => void
    sendMessage: (message: string) => Promise<void>
    handleStreamChunk: (data: any) => void
}

const chat = new MandrakeChat()

export const useChatStore = create<ChatState>()((set, get) => ({
    // Initial state
    sessions: [],
    currentSession: null,
    currentRounds: [],
    isStreaming: false,
    streamingContent: [],
    currentToolCall: null,
    input: '',
    isLoading: false,
    userInput: '',

    // Actions
    setInput: (input) => set({ input }),

    fetchSessions: async () => {
        try {
            const response = await fetch('/api/chat/sessions')
            const data = await response.json()

            set({ sessions: data })

            if (data.length > 0 && !get().currentSession) {
                await get().loadSession(data[0].id)
            }
        } catch (error) {
            console.error('Error fetching sessions:', error)
        }
    },

    loadSession: async (sessionId) => {
        try {
            const response = await fetch(`/api/chat/${sessionId}`)
            const session = await response.json()
            set({
                currentSession: session,
                currentRounds: session.rounds || [],
            })
        } catch (error) {
            console.error('Error loading session:', error)
        }
    },

    startNewSession: () => {
        set({
            currentSession: null,
            currentRounds: []
        })
    },

    sendMessage: async (message) => {
        const { currentSession } = get()
        set({ isLoading: true, userInput: message })

        try {
            const response = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    sessionId: currentSession?.id
                })
            })

            if (!response.ok || !response.body) {
                throw new Error('Stream response not ok')
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()

            while (true) {
                const { value, done } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                const lines = chunk.split('\n').filter(Boolean)

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line)
                        get().handleStreamChunk(data)
                    } catch (error) {
                        console.error('Error processing chunk:', error)
                    }
                }
            }
        } catch (error) {
            console.error('Error in chat stream:', error)
        } finally {
            set({ isLoading: false })
        }
    },

    handleStreamChunk: (data) => {
        set((state) => {
            switch (data.type) {
                case 'chunk': {
                    const chunkText = typeof data.content === 'string'
                        ? data.content
                        : JSON.stringify(data.content)

                    let newTurns = [...state.streamingContent]

                    if (!newTurns.length || !newTurns[newTurns.length - 1].content) {
                        newTurns.push({
                            id: `streaming-${newTurns.length}`,
                            responseId: 'streaming',
                            index: newTurns.length,
                            content: chunkText
                        })
                    } else {
                        const lastTurn = newTurns[newTurns.length - 1]
                        newTurns[newTurns.length - 1] = {
                            ...lastTurn,
                            content: (lastTurn.content || '') + chunkText
                        }
                    }

                    return { streamingContent: newTurns }
                }

                case 'tool_call': {
                    const toolCall: Turn = {
                        id: `streaming-tool-${state.streamingContent.length}`,
                        responseId: 'streaming',
                        index: state.streamingContent.length,
                        toolCall: {
                            server: data.content.server,
                            name: data.content.name,
                            input: data.content.input
                        }
                    }
                    return {
                        currentToolCall: toolCall,
                        streamingContent: [...state.streamingContent, toolCall]
                    }
                }

                case 'tool_result': {
                    if (!state.currentToolCall) return state

                    const updated = [...state.streamingContent]
                    const toolIndex = updated.findIndex(
                        turn => turn === state.currentToolCall
                    )

                    if (toolIndex !== -1) {
                        updated[toolIndex] = {
                            ...updated[toolIndex],
                            toolResult: data.content
                        }
                    }

                    return {
                        streamingContent: updated,
                        currentToolCall: null
                    }
                }

                default:
                    return state
            }
        })
    },
}))