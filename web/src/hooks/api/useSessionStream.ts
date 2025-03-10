/**
 * React hook for session streaming
 */
import { useState, useEffect } from 'react';
import { createSessionStream } from '@/lib/api/core/streaming';
import { 
  StreamInitEvent,
  TurnEvent,
  ErrorEvent,
  CompletedEvent,
  StreamEventUnion
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
  
  // Connect/disconnect effect
  useEffect(() => {
    if (!sessionId || !workspaceId || !shouldConnect) return;
    
    // Set connected state
    setState(prev => ({ ...prev, isConnected: true }));
    
    // Create stream
    const cleanup = createSessionStream(sessionId, workspaceId, {
      onInit: (event) => {
        setState(prev => ({
          ...prev,
          init: event,
          events: [...prev.events, event]
        }));
      },
      
      onTurn: (event) => {
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
        setState(prev => ({
          ...prev,
          error: event,
          isConnected: false,
          events: [...prev.events, event]
        }));
      },
      
      onComplete: (event) => {
        setState(prev => ({
          ...prev,
          isComplete: true,
          isConnected: false,
          events: [...prev.events, event]
        }));
      },
      
      onEvent: (event) => {
        // This handler is used to capture all events if needed
        // Already captured in specific handlers, so nothing needed here
      }
    });
    
    // Cleanup function
    return () => {
      cleanup();
      setState(prev => ({ ...prev, isConnected: false }));
    };
  }, [sessionId, workspaceId, shouldConnect]);
  
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
    reset
  };
}