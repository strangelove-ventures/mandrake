/**
 * Streaming API support for WebSockets
 */
import { 
  StreamEventUnion,
  StreamInitEvent,
  TurnEvent,
  ErrorEvent,
  CompletedEvent
} from '@mandrake/utils/dist/types/api';

/**
 * Handlers for stream events
 */
export interface StreamEventHandlers {
  /** Called when stream is initialized */
  onInit?: (event: StreamInitEvent) => void;
  /** Called when a turn/content is updated */
  onTurn?: (event: TurnEvent) => void;
  /** Called when an error occurs */
  onError?: (event: ErrorEvent) => void;
  /** Called when stream completes */
  onComplete?: (event: CompletedEvent) => void;
  /** Called for any event (raw handler) */
  onEvent?: (event: StreamEventUnion) => void;
  /** Called when WebSocket is connected */
  onConnect?: () => void;
}

/**
 * WebSocket connection states
 */
enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting'
}

/**
 * Creates a WebSocket connection to stream session data
 */
export function createSessionStream(
  sessionId: string, 
  workspaceId: string,
  handlers: StreamEventHandlers
): () => void {
  // WebSocket needs an absolute URL with protocol 
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const baseUrl = typeof window !== 'undefined' 
    ? protocol + '//' + window.location.host + '/api' 
    : 'ws://localhost:4000';
    
  // Build the URL based on workspace ID
  let url;
  if (workspaceId) {
    url = `${baseUrl}/workspaces/${workspaceId}/sessions/${sessionId}/streaming/ws`;
  } else {
    url = `${baseUrl}/system/sessions/${sessionId}/streaming/ws`;
  }
  
  // Track connection state
  let connectionState = ConnectionState.CONNECTING;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY_MS = 1000;
  
  console.log(`Creating WebSocket connection to ${url}`);
  
  // Create WebSocket connection
  let ws: WebSocket;
  let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  
  // Set a timeout for the initial connection
  const connectionTimeoutId = setTimeout(() => {
    if (connectionState === ConnectionState.CONNECTING) {
      console.warn('WebSocket connection timeout after 10 seconds');
      
      const errorEvent: ErrorEvent = {
        type: 'error',
        message: 'Connection timeout after 10 seconds'
      };
      
      handlers.onError?.(errorEvent);
      
      // Try to reconnect
      reconnect();
    }
  }, 10000);
  
  // Create the WebSocket connection
  function createWebSocket() {
    ws = new WebSocket(url);
    
    // Handle connection open
    ws.addEventListener('open', () => {
      console.log('WebSocket connected');
      clearTimeout(connectionTimeoutId);
      connectionState = ConnectionState.CONNECTED;
      reconnectAttempts = 0;
      
      // Notify handler of connection
      handlers.onConnect?.();
    });
    
    // Handle incoming messages
    ws.addEventListener('message', (event) => {
      console.log('Received WebSocket message:', event.data);
      try {
        // Parse the event data
        const data = JSON.parse(event.data) as StreamEventUnion;
        
        // Call the generic event handler if provided
        if (handlers.onEvent) {
          console.log('Calling onEvent handler with data:', data);
          handlers.onEvent(data);
        }
        
        // Call event-specific handlers
        switch (data.type) {
          case 'initialized':
            handlers.onInit?.(data);
            break;
          case 'turn':
            handlers.onTurn?.(data);
            break;
          case 'error':
            handlers.onError?.(data);
            break;
          case 'completed':
            handlers.onComplete?.(data);
            break;
          case 'ready':
            // Special case for WebSocket ready event
            console.log('WebSocket ready for session:', data.sessionId);
            break;
          default:
            console.warn('Unknown stream event type:', data);
        }
      } catch (error) {
        // Handle JSON parsing errors
        const errorEvent: ErrorEvent = {
          type: 'error',
          message: `Failed to parse event data: ${String(error)}`
        };
        
        handlers.onError?.(errorEvent);
        console.error('Error parsing stream event:', error);
      }
    });
    
    // Handle connection errors
    ws.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      
      const errorEvent: ErrorEvent = {
        type: 'error',
        message: `WebSocket error: ${String(error)}`
      };
      
      handlers.onError?.(errorEvent);
    });
    
    // Handle connection close
    ws.addEventListener('close', (event) => {
      console.log(`WebSocket closed: ${event.code} ${event.reason}`);
      
      if (connectionState !== ConnectionState.DISCONNECTED) {
        connectionState = ConnectionState.RECONNECTING;
        reconnect();
      }
    });
  }
  
  // Function to handle reconnection
  function reconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`Failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts`);
      
      const errorEvent: ErrorEvent = {
        type: 'error',
        message: `Failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts`
      };
      
      handlers.onError?.(errorEvent);
      connectionState = ConnectionState.DISCONNECTED;
      return;
    }
    
    reconnectAttempts++;
    console.log(`Reconnecting (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
    
    // Clear any existing timeout
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId);
    }
    
    // Set timeout for reconnection with exponential backoff
    const delay = RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts - 1);
    reconnectTimeoutId = setTimeout(() => {
      createWebSocket();
    }, delay);
  }
  
  // Create the initial WebSocket connection
  createWebSocket();
  
  /**
   * Send a message to the WebSocket
   */
  function sendMessage(content: string) {
    if (connectionState !== ConnectionState.CONNECTED) {
      console.warn('Cannot send message: WebSocket not connected');
      return false;
    }
    
    if (ws.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: WebSocket not open');
      return false;
    }
    
    try {
      ws.send(JSON.stringify({ content }));
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }
  
  // Return cleanup function
  return () => {
    console.log('Cleaning up WebSocket connection');
    
    // Set the state to disconnected to prevent reconnect attempts
    connectionState = ConnectionState.DISCONNECTED;
    
    // Clear timeouts
    clearTimeout(connectionTimeoutId);
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId);
    }
    
    // Close the WebSocket if it's open
    if (ws && [WebSocket.CONNECTING, WebSocket.OPEN].includes(ws.readyState)) {
      ws.close();
    }
  };
}

// This is where legacy SSE code was removed.
// The application now exclusively uses WebSockets for streaming.
