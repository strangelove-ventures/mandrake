/**
 * React hook for session streaming
 */
import { useState, useEffect, useRef } from 'react';
import { createSessionStream } from '@/lib/api/core/streaming';
import { 
  StreamInitEvent,
  TurnEvent,
  ErrorEvent,
  StreamEventUnion,
  ReadyEvent
} from '@mandrake/utils/dist/types/api';

/**
 * State for session streaming
 */
interface SessionStreamState {
  /** Whether the stream is connected */
  isConnected: boolean;
  /** Whether the stream is complete */
  isComplete: boolean;
  /** Error information if an error occurred */
  error: ErrorEvent | null;
  /** Stream initialization data */
  init: StreamInitEvent | null;
  /** Current turns/content updates */
  turns: TurnEvent[];
  /** All events received (for debugging) */
  events: StreamEventUnion[];
}

/**
 * Props for useSessionStream hook
 */
interface UseSessionStreamProps {
  /** Session ID */
  sessionId: string;
  /** Workspace ID */
  workspaceId: string;
  /** Whether to auto-connect */
  autoConnect?: boolean;
}

/**
 * Hook for streaming session updates
 */
export function useSessionStream({ 
  sessionId, 
  workspaceId, 
  autoConnect = true 
}: UseSessionStreamProps) {
  // Stream state
  const [state, setState] = useState<SessionStreamState>({
    isConnected: false,
    isComplete: false,
    error: null,
    init: null,
    turns: [],
    events: []
  });
  
  // Connection control
  const [shouldConnect, setShouldConnect] = useState(autoConnect);
  
  // Ref to store the sendMessage function returned by createSessionStream
  const sendMessageRef = useRef<((content: string) => boolean) | null>(null);
  
  // Connect/disconnect effect
  useEffect(() => {
    if (!sessionId || !shouldConnect) return;
    
    console.log(`Connecting to session stream: ${sessionId} - Workspace: ${workspaceId || 'system'}`);
    
    // Create stream with WebSocket
    const { cleanup, sendMessage } = createSessionStream(sessionId, workspaceId, {
      onConnect: () => {
        console.log('WebSocket connected');
        setState(prev => ({ 
          ...prev, 
          isConnected: true, 
          isComplete: false,
          error: null
        }));
      },
      
      onInit: (event) => {
        console.log('Stream initialized:', event);
        setState(prev => ({
          ...prev,
          init: event,
          events: [...prev.events, event],
          isComplete: false,
          error: null
        }));
      },
      
      onTurn: (event) => {
        console.log('Received turn event:', event);
        setState(prev => {
          // Find if this turn already exists
          const turnIndex = prev.turns.findIndex(t => t.turnId === event.turnId);
          
          if (turnIndex >= 0) {
            // Update existing turn
            const updatedTurns = [...prev.turns];
            updatedTurns[turnIndex] = event;
            
            return {
              ...prev,
              turns: updatedTurns,
              events: [...prev.events, event]
            };
          } else {
            // Add new turn
            return {
              ...prev,
              turns: [...prev.turns, event],
              events: [...prev.events, event]
            };
          }
        });
      },
      
      onError: (event) => {
        console.error('Stream error:', event);
        setState(prev => ({
          ...prev,
          error: event,
          // Note: we don't set isConnected to false here 
          // because the WebSocket might still be connected despite an error
          events: [...prev.events, event]
        }));
      },
      
      onComplete: (event) => {
        console.log('Stream completed:', event);
        setState(prev => ({
          ...prev,
          isComplete: true,
          // WebSocket connection can remain open for future requests
          events: [...prev.events, event]
        }));
      },
      
      onEvent: (event) => {
        // This handler is used to capture all events
        console.log('Generic event handler called:', event);
        
        // Handle WebSocket ready event
        if (event.type === 'ready') {
          console.log('WebSocket ready event received');
          setState(prev => ({
            ...prev,
            isConnected: true,
            events: [...prev.events, event]
          }));
        }
      }
    });
    
    // Store the sendMessage function in the ref for use outside the effect
    sendMessageRef.current = sendMessage;
    
    // Cleanup function
    return () => {
      cleanup();
      setState(prev => ({ ...prev, isConnected: false }));
      sendMessageRef.current = null;
    };
  }, [sessionId, workspaceId, shouldConnect]);
  
  // Function to send a message through the WebSocket
  const sendMessage = (content: string): boolean => {
    if (!sendMessageRef.current) {
      console.warn('Cannot send message: WebSocket not initialized');
      return false;
    }
    
    return sendMessageRef.current(content);
  };
  
  // Control functions
  const connect = () => setShouldConnect(true);
  const disconnect = () => setShouldConnect(false);
  const reset = () => {
    disconnect();
    setState({
      isConnected: false,
      isComplete: false,
      error: null,
      init: null,
      turns: [],
      events: []
    });
  };
  
  return {
    // Stream state
    isConnected: state.isConnected,
    isComplete: state.isComplete,
    error: state.error,
    turns: state.turns,
    events: state.events,
    init: state.init,
    
    // Latest content (most recent turn content)
    latestContent: state.turns.length > 0 
      ? state.turns[state.turns.length - 1].content 
      : '',
    
    // Control methods
    connect,
    disconnect,
    reset,
    sendMessage
  };
}