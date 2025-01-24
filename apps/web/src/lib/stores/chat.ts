'use client'
import { create } from 'zustand'
import { Session, Round, Turn } from '@mandrake/types'

interface ChatState {
    // Session state
    sessions: Session[]
    currentSession: Session | null
    currentRounds: Round[]

    // Stream state 
    isStreaming: boolean
    streamingContent: Turn[] 
    currentToolCall: Turn | null 
    pendingRoundId: string
    
    // Text buffering state
    jsonBuffer: string
    textBuffer: string

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
    processJsonContent: (content: string) => void
    flushTextBuffer: () => void
}

export const useChatStore = create<ChatState>()((set, get) => ({
    // Initial state
    sessions: [],
    currentSession: null,
    currentRounds: [],
    isStreaming: false,
    streamingContent: [],
    currentToolCall: null,
    pendingRoundId: '',
    jsonBuffer: '',
    textBuffer: '',
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
            console.log('Loading session:', sessionId);
            console.log('Current state before load:', get());

            const response = await fetch(`/api/chat/${sessionId}`)
            const session = await response.json()
            console.log('Received session data:', session);

            set((state) => {
                console.log('Setting new state with:', {
                    currentSession: session,
                    currentRounds: session.rounds || [],
                    streamingContent: state.streamingContent,
                    pendingRoundId: state.pendingRoundId
                });

                return {
                    currentSession: session,
                    currentRounds: session.rounds || [],
                    // Don't reset streaming or pending state
                    streamingContent: state.streamingContent,
                    pendingRoundId: state.pendingRoundId
                };
            });

            console.log('State after load:', get());
        } catch (error) {
            console.error('Error loading session:', error)
        }
    },

    startNewSession: () => {
        set({
            currentSession: null,
            currentRounds: [],
            streamingContent: [],
            currentToolCall: null,
            jsonBuffer: '',
            textBuffer: ''
        })
    },

    sendMessage: async (message) => {
        const { currentSession, currentRounds } = get()
        console.log('Sending message, current state:', { currentSession, currentRounds });

        const pendingRoundId = `pending-${Date.now()}`;

        set({
            isLoading: true,
            userInput: message,
            pendingRoundId,
            currentRounds: currentRounds, // Preserve existing rounds
            streamingContent: [],
            jsonBuffer: '',
            textBuffer: ''
        });

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
            console.log('Stream complete, state before loadSession:', get());

            // After stream completes, fetch updated session to get final state
            if (currentSession?.id) {
                await get().loadSession(currentSession.id)
            }
            console.log('Final state after loadSession:', get());

        } catch (error) {
            console.error('Error in chat stream:', error)
        } finally {
            get().flushTextBuffer()
            set({ isLoading: false })
            console.log('State after cleanup:', get());
        }
    },

    processJsonContent: (content: string) => {
        const state = get()
        let { jsonBuffer } = state

        // Accumulate JSON content
        jsonBuffer += content

        try {
            // Attempt to parse accumulated JSON
            const parsed = JSON.parse(jsonBuffer)
            if (!Array.isArray(parsed)) {
                get().handleStreamChunk({ type: 'chunk', content: jsonBuffer })
                set({ jsonBuffer: '' })
                return
            }

            // Process each content item
            for (const item of parsed) {
                if (item.type === 'text') {
                    get().handleStreamChunk({ type: 'chunk', content: item.text })
                } else if (item.type === 'tool_use') {
                    get().handleStreamChunk({ 
                        type: 'tool_call',
                        content: {
                            name: item.name,
                            input: item.input
                        }
                    })
                }
            }

            // Clear buffer after successful processing
            set({ jsonBuffer: '' })
        } catch (e) {
            // If parsing fails, keep accumulating
            if (!isCompleteJson(jsonBuffer)) {
                set({ jsonBuffer })
            } else {
                // If we have complete but invalid JSON, treat as text
                get().handleStreamChunk({ type: 'chunk', content: jsonBuffer })
                set({ jsonBuffer: '' })
            }
        }
    },

    flushTextBuffer: () => {
        const { textBuffer } = get()
        if (textBuffer) {
            get().handleStreamChunk({ type: 'chunk', content: textBuffer })
            set({ textBuffer: '' })
        }
    },

    handleStreamChunk: (data) => {
        set((state) => {
            switch (data.type) {
                case 'chunk': {
                    // Data is already parsed, so content might be either a string or an object
                    let content = data.content;

                    // If it's an object with the LLM response format, extract the text
                    if (content && typeof content === 'object' && content.content && Array.isArray(content.content)) {
                        const textContent = content.content.find((item: { type: string }) => item.type === 'text');
                        if (textContent) {
                            content = textContent.text;
                        }
                    }

                    const chunkText = typeof content === 'string'
                        ? content
                        : JSON.stringify(content);

                    let newTurns = [...state.streamingContent];

                    if (!newTurns.length || !newTurns[newTurns.length - 1].content) {
                        newTurns.push({
                            id: `streaming-${newTurns.length}-${Date.now()}`,
                            responseId: 'streaming',
                            index: newTurns.length,
                            content: chunkText
                        });
                    } else {
                        const lastTurn = newTurns[newTurns.length - 1];
                        newTurns[newTurns.length - 1] = {
                            ...lastTurn,
                            content: (lastTurn.content || '') + chunkText,
                        };
                    }

                    return { streamingContent: newTurns };
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

// Helper function for JSON validation
function isCompleteJson(text: string): boolean {
    const sanitized = text.replace(/\\s+/g, ' ').trim()
    let depth = 0
    let inString = false
    let escaped = false

    for (const char of sanitized) {
        if (!inString) {
            if (char === '{') depth++
            if (char === '}') depth--
            if (char === '"') inString = true
        } else {
            if (char === '\\\\' && !escaped) {
                escaped = true
                continue
            }
            if (char === '"' && !escaped) inString = false
            escaped = false
        }
    }

    return depth === 0 && !inString && sanitized.startsWith('{')
}