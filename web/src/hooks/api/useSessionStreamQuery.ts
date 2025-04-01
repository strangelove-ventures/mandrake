/**
 * Custom React Query hook for session streaming without CSP issues
 */
import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { 
  StreamInitEvent,
  TurnEvent,
  ErrorEvent,
  StreamEventUnion,
  CompletedEvent,
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
 * Props for useSessionStreamQuery hook
 */
interface UseSessionStreamQueryProps {
  /** Session ID */
  sessionId: string;
  /** Workspace ID */
  workspaceId: string;
  /** Whether to auto-connect */
  autoConnect?: boolean;
  /** Connection method to use */
  connectionMethod?: 'websocket' | 'fetch' | 'eventsource'; // Note: 'eventsource' is deprecated
}

/**
 * Create a SSE connection using the traditional EventSource API (may trigger CSP in some browsers)
 */
function createEventSourceStream(
  url: string,
  onMessage: (data: StreamEventUnion) => void,
  onError: (error: Error) => void
): () => void {
  console.log(`Creating EventSource for ${url}`);
  
  // Create EventSource
  const eventSource = new EventSource(url);
  
  // Handle connection open
  eventSource.onopen = () => {
    console.log('EventSource connected');
  };
  
  // Handle incoming messages
  eventSource.onmessage = (event) => {
    console.log('Received SSE message:', event.data);
    try {
      // Parse the event data
      const data = JSON.parse(event.data) as StreamEventUnion;
      onMessage(data);
    } catch (error) {
      // Handle JSON parsing errors
      console.error('Error parsing stream event:', error);
      onError(error as Error);
    }
  };
  
  // Handle connection errors
  eventSource.onerror = (error) => {
    console.error('EventSource error:', error);
    onError(new Error(`EventSource error: ${String(error)}`));
    eventSource.close();
  };
  
  // Return cleanup function
  return () => {
    console.log('Cleaning up EventSource');
    eventSource.close();
  };
}

/**
 * Create a WebSocket connection
 * This is the most modern approach and avoids CSP issues
 */
function createWebSocketConnection(
  url: string,
  onMessage: (data: StreamEventUnion) => void,
  onError: (error: Error) => void
): () => void {
  console.log(`Creating WebSocket connection to ${url}`);
  
  // WebSocket needs a WS/WSS protocol
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = url.replace(/^https?:\/\//, protocol + '//') + '/ws';
  
  // Create WebSocket
  const ws = new WebSocket(wsUrl);
  
  // Track connection state
  let isConnected = false;
  
  // Handle connection open
  ws.addEventListener('open', () => {
    console.log('WebSocket connected');
    isConnected = true;
  });
  
  // Handle incoming messages
  ws.addEventListener('message', (event) => {
    console.log('Received WebSocket message:', event.data);
    try {
      // Parse the event data
      const data = JSON.parse(event.data) as StreamEventUnion;
      onMessage(data);
    } catch (error) {
      // Handle JSON parsing errors
      console.error('Error parsing WebSocket message:', error);
      onError(error as Error);
    }
  });
  
  // Handle connection errors
  ws.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
    onError(new Error(`WebSocket error: ${String(error)}`));
  });
  
  // Handle connection close
  ws.addEventListener('close', (event) => {
    console.log(`WebSocket closed: ${event.code} ${event.reason}`);
    if (isConnected) {
      onError(new Error(`WebSocket connection closed: ${event.code} ${event.reason}`));
      isConnected = false;
    }
  });
  
  // Return cleanup function
  return () => {
    console.log('Cleaning up WebSocket connection');
    
    // Close the WebSocket if it's open
    if (ws && [WebSocket.CONNECTING, WebSocket.OPEN].includes(ws.readyState)) {
      ws.close();
    }
  };
}

/**
 * Create a SSE connection using the Fetch API with ReadableStream
 * This approach avoids CSP issues with unsafe-eval
 */
async function createFetchBasedSSE(
  url: string,
  onMessage: (data: StreamEventUnion) => void,
  onError: (error: Error) => void,
  signal: AbortSignal
) {
  try {
    console.log(`Creating fetch-based SSE for ${url}`);
    
    // Make the request with the appropriate headers
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      signal, // Pass the abort signal to allow cancellation
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Ensure the response body is available as a ReadableStream
    if (!response.body) {
      throw new Error("Response doesn't have a body");
    }

    // Get a reader from the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Process the stream
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('Stream closed by server');
        break;
      }
      
      // Decode the chunk and add it to our buffer
      buffer += decoder.decode(value, { stream: true });
      
      // Process any complete messages in the buffer
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || ''; // Keep the last potentially incomplete chunk
      
      for (const line of lines) {
        if (line.trim() === '') continue;
        
        // Handle each message
        try {
          // Extract data from the event format "data: {...}"
          const dataMatch = line.match(/^data: (.+)$/m);
          if (dataMatch && dataMatch[1]) {
            const eventData = JSON.parse(dataMatch[1]) as StreamEventUnion;
            console.log('Received SSE event:', eventData);
            onMessage(eventData);
          }
        } catch (e) {
          console.error('Error parsing SSE message:', e, line);
        }
      }
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('SSE connection error:', error);
      onError(error as Error);
    }
  }
}

/**
 * React Query hook for session streaming without CSP issues
 */
export function useSessionStreamQuery({
  sessionId,
  workspaceId,
  autoConnect = false,
  connectionMethod = 'websocket' // Default to WebSocket for best compatibility
}: UseSessionStreamQueryProps) {
  // Use a ref to store state between renders
  const stateRef = useRef<SessionStreamState>({
    isConnected: false,
    isComplete: false,
    error: null,
    init: null,
    turns: [],
    events: []
  });
  
  // State to trigger re-renders
  const [state, setState] = useState<SessionStreamState>(stateRef.current);
  
  // State to control the connection
  const [shouldConnect, setShouldConnect] = useState(autoConnect);
  
  // Cleanup reference for connection management
  const cleanupRef = useRef<(() => void) | null>(null);
  
  // Handler for stream events
  const handleMessage = (eventData: StreamEventUnion) => {
    // Update the state based on event type
    switch (eventData.type) {
      case 'initialized':
        stateRef.current = {
          ...stateRef.current,
          init: eventData as StreamInitEvent,
          events: [...stateRef.current.events, eventData],
          isConnected: true,
          isComplete: false,
          error: null
        };
        break;
        
      case 'turn':
        const turnEvent = eventData as TurnEvent;
        
        console.log('Received turn event:', turnEvent);
        
        // Add responseId to the turn event if it's missing
        // Use the init.responseId if available, or derive from the turnId
        if (!turnEvent.responseId && stateRef.current.init?.responseId) {
          turnEvent.responseId = stateRef.current.init.responseId;
        } else if (!turnEvent.responseId && turnEvent.turnId) {
          // Try to extract responseId from turnId (often formatted as responseId:turnIndex)
          const parts = turnEvent.turnId.split(':');
          if (parts.length > 1) {
            turnEvent.responseId = parts[0];
          }
        }
        
        // Find if this turn already exists
        const existingTurns = [...stateRef.current.turns];
        const turnIndex = existingTurns.findIndex(t => t.turnId === turnEvent.turnId);
        
        if (turnIndex >= 0) {
          // Update existing turn
          existingTurns[turnIndex] = turnEvent;
        } else {
          // Add new turn
          existingTurns.push(turnEvent);
        }
        
        stateRef.current = {
          ...stateRef.current,
          turns: existingTurns,
          events: [...stateRef.current.events, eventData]
        };
        break;
        
      case 'error':
        stateRef.current = {
          ...stateRef.current,
          error: eventData as ErrorEvent,
          isConnected: false,
          events: [...stateRef.current.events, eventData]
        };
        break;
        
      case 'completed':
        stateRef.current = {
          ...stateRef.current,
          isComplete: true,
          isConnected: false,
          events: [...stateRef.current.events, eventData]
        };
        break;
        
      case 'ready':
        // WebSocket ready notification
        stateRef.current = {
          ...stateRef.current,
          isConnected: true,
          events: [...stateRef.current.events, eventData]
        };
        break;
        
      default:
        // Unknown event type, just add to events
        stateRef.current = {
          ...stateRef.current,
          events: [...stateRef.current.events, eventData]
        };
    }
    
    // Update the state to trigger a re-render
    setState({ ...stateRef.current });
  };
  
  // Handler for stream errors
  const handleError = (error: Error) => {
    console.error('Stream connection error:', error);
    
    const errorEvent: ErrorEvent = {
      type: 'error',
      message: `Stream connection error: ${error.message}`
    };
    
    stateRef.current = {
      ...stateRef.current,
      error: errorEvent,
      isConnected: false,
      events: [...stateRef.current.events, errorEvent]
    };
    
    setState({ ...stateRef.current });
  };
  
  // WebSocket and EventSource connection effect
  useEffect(() => {
    if (!shouldConnect || !sessionId) {
      return;
    }
    
    // When using WebSockets, we should always use the WebSocket implementation
    // EventSource is now deprecated and only kept for backward compatibility
    const effectiveMethod = connectionMethod === 'eventsource' ? 'websocket' : connectionMethod;
    
    if (!['websocket', 'eventsource'].includes(effectiveMethod)) {
      return;
    }
    
    // Build the URL based on workspace ID
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin + '/api' 
      : 'http://localhost:4000';
      
    let url;
    if (workspaceId) {
      url = `${baseUrl}/workspaces/${workspaceId}/sessions/${sessionId}/streaming`;
    } else {
      url = `${baseUrl}/system/sessions/${sessionId}/streaming`;
    }
    
    console.log(`Connecting to session stream with ${effectiveMethod}: ${sessionId} - Workspace: ${workspaceId || 'system'}`);
    
    // Update state to show connection
    const newState = { 
      ...stateRef.current, 
      isConnected: true,
      isComplete: false,
      error: null
    };
    stateRef.current = newState;
    setState(newState);
    
    // Always use WebSocket as the primary method now
    // EventSource is only kept for backward compatibility
    cleanupRef.current = createWebSocketConnection(
      url,
      handleMessage,
      handleError
    );
    
    // Cleanup on unmount or when connection params change
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [sessionId, workspaceId, shouldConnect, connectionMethod]);
  
  // For Fetch API method
  const query = useQuery({
    queryKey: ['sessionStream', sessionId, workspaceId, shouldConnect, connectionMethod],
    queryFn: async ({ signal }) => {
      if (!sessionId || !shouldConnect || connectionMethod !== 'fetch') {
        return stateRef.current;
      }
      
      // Build the URL based on workspace ID
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin + '/api' 
        : 'http://localhost:4000';
        
      let url;
      if (workspaceId) {
        url = `${baseUrl}/workspaces/${workspaceId}/sessions/${sessionId}/streaming`;
      } else {
        url = `${baseUrl}/system/sessions/${sessionId}/streaming`;
      }
      
      console.log(`Connecting to session stream with Fetch API: ${sessionId} - Workspace: ${workspaceId || 'system'}`);
      
      // Update state to show connection
      const newState = { 
        ...stateRef.current, 
        isConnected: true,
        isComplete: false,
        error: null
      };
      stateRef.current = newState;
      setState(newState);
      
      // Create the fetch-based SSE connection
      await createFetchBasedSSE(
        url,
        handleMessage,
        handleError,
        signal
      );
      
      // Return the current state
      return stateRef.current;
    },
    enabled: shouldConnect && !!sessionId && connectionMethod === 'fetch',
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    gcTime: 0, // Don't keep old data in cache
  });

  // Connect/disconnect methods
  const connect = () => {
    console.log('Connecting to stream...');
    setShouldConnect(true);
  };

  const disconnect = () => {
    console.log('Disconnecting from stream...');
    setShouldConnect(false);
    
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isConnected: false
    }));
  };

  // Reset method
  const reset = () => {
    console.log('Resetting stream state...');
    disconnect();
    
    const initialState = {
      isConnected: false,
      isComplete: false,
      error: null,
      init: null,
      turns: [],
      events: []
    };
    
    stateRef.current = initialState;
    setState(initialState);
  };

  // Return the hook interface
  return {
    // Stream state
    ...state,
    
    // Latest content (most recent turn content)
    latestContent: state.turns.length > 0 
      ? state.turns[state.turns.length - 1].content 
      : '',
    
    // Control methods
    connect,
    disconnect,
    reset,
    
    // Query status
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isRefetching: query.isRefetching,
    isError: query.isError,
    queryError: query.error,
  };
}