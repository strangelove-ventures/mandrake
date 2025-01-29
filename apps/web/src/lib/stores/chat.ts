'use client'

import { create } from 'zustand'
import { Session, Round, Turn } from '@mandrake/types'

interface ActiveStream {
  roundId: string
  userMessage: string
  streamedContent: string
  isComplete: boolean
}

interface ChatState {
  // Persistent state from DB
  session: Session | null

  // Temporary streaming state
  activeStream: ActiveStream | null

  // UI state
  input: string
  isLoading: boolean
  eventSource: EventSource | null

  // Actions
  setInput: (input: string) => void
  connectSession: (sessionId: string) => Promise<void>
  disconnectSession: () => void
  sendMessage: (message: string) => Promise<void>
  handleSessionUpdate: (session: Session) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  session: null,
  activeStream: null,
  input: '',
  isLoading: false,
  eventSource: null,

  setInput: (input) => set({ input }),

  connectSession: async (sessionId: string) => {
    try {
      console.log('Connecting to session:', sessionId)
      // Initial session load
      const response = await fetch(`/api/chat/${sessionId}`)
      const session = await response.json()
      set({ session })

      // Setup SSE for session updates
      console.log('Setting up EventSource')
      const es = new EventSource(`/api/chat/${sessionId}/stream`)

      es.onopen = () => {
        console.log('EventSource connected')
      }

      es.onmessage = (event) => {
        console.log('Received SSE message:', event.data)
        try {
          const update = JSON.parse(event.data)
          if (update.type === 'session_update') {
            // Replace streaming content if this update contains our streaming round
            set(state => {
              const updatedSession = update.data
              const streamingRound = state.activeStream?.roundId
              
              if (streamingRound && updatedSession.rounds.find((r: { id: string }) => r.id === streamingRound)) {
                return {
                  session: updatedSession,
                  activeStream: null
                }
              }
              return { session: updatedSession }
            })
          }
        } catch (error) {
          console.error('Error processing SSE message:', error)
        }
      }

      es.onerror = (error) => {
        console.error('EventSource error:', error)
        if (es.readyState === EventSource.CLOSED) {
          console.log('EventSource connection closed')
        }
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

  sendMessage: async (message: string) => {
    const { session } = get()

    // Setup streaming state
    set({
      isLoading: true,
      activeStream: {
        roundId: `pending-${Date.now()}`,
        userMessage: message,
        streamedContent: '',
        isComplete: false
      }
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

        // Add new chunks to buffer
        buffer += decoder.decode(value)
        
        // Find complete JSON objects in buffer
        let startIndex = 0
        let openBraces = 0
        let jsonStart = -1

        for (let i = 0; i < buffer.length; i++) {
          if (buffer[i] === '{') {
            if (openBraces === 0) jsonStart = i
            openBraces++
          } else if (buffer[i] === '}') {
            openBraces--
            if (openBraces === 0 && jsonStart !== -1) {
              // We found a complete JSON object
              try {
                const jsonStr = buffer.slice(jsonStart, i + 1)
                const parsed = JSON.parse(jsonStr)
                
                // Handle the structured response
                if (Array.isArray(parsed.content)) {
                  for (const item of parsed.content) {
                    if (item.type === 'text') {
                      set(state => ({
                        activeStream: state.activeStream ? {
                          ...state.activeStream,
                          streamedContent: state.activeStream.streamedContent + item.text
                        } : null
                      }))
                    }
                  }
                }

                // Remove processed JSON from buffer
                buffer = buffer.slice(i + 1)
                startIndex = 0
                i = -1 // Reset loop
                jsonStart = -1
              } catch (e) {
                console.error('Error parsing JSON object:', e)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in chat stream:', error)
    } finally {
      // Mark streaming as complete but keep content until DB update arrives
      set(state => ({
        isLoading: false,
        activeStream: state.activeStream ? {
          ...state.activeStream,
          isComplete: true
        } : null
      }))
    }
  },

  handleSessionUpdate: (session: Session) => {
    set(state => {
      // If this update contains our streaming round, clear the streaming state
      const streamingRound = state.activeStream?.roundId
      if (streamingRound && session.rounds.find(r => r.id === streamingRound)) {
        return {
          session,
          activeStream: null
        }
      }
      return { session }
    })
  }
}))
