/**
 * Streaming API support for server-sent events
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
}

/**
 * Creates an EventSource connection to stream session data
 */
export function createSessionStream(
  sessionId: string, 
  workspaceId: string,
  handlers: StreamEventHandlers
): () => void {
  // EventSource needs an absolute URL with protocol
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin + '/api' 
    : 'http://localhost:4000';
    
  // Build the URL based on workspace ID
  let url;
  if (workspaceId) {
    // Updated URL pattern to include /sessions/ in the path
    url = `${baseUrl}/workspaces/${workspaceId}/sessions/${sessionId}/streaming`;
  } else {
    // Updated URL pattern to include /sessions/ in the path
    url = `${baseUrl}/system/sessions/${sessionId}/streaming`;
  }
  
  // Create the EventSource with a timeout and retry count
  console.log(`Creating EventSource for ${url}`);
  
  // Create a controller that we can use to abort the connection if needed
  const controller = new AbortController();
  const { signal } = controller;
  
  // Set a timeout to abort the connection if we don't receive a message in 10 seconds
  const timeoutId = setTimeout(() => {
    console.warn('EventSource timeout after 10 seconds');
    controller.abort();
    
    const errorEvent: ErrorEvent = {
      type: 'error',
      message: 'Connection timeout after 10 seconds'
    };
    
    handlers.onError?.(errorEvent);
  }, 10000);
  
  const eventSource = new EventSource(url);
  
  // Handle connection open
  eventSource.onopen = () => {
    console.log('EventSource connected');
    // Clear the timeout when we get a connection
    clearTimeout(timeoutId);
  };
  
  // Handle incoming messages
  eventSource.onmessage = (event) => {
    console.log('Received SSE message:', event.data);
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
          eventSource.close();
          break;
        case 'completed':
          handlers.onComplete?.(data);
          eventSource.close();
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
  };
  
  // Handle connection errors
  eventSource.onerror = (error) => {
    console.error('EventSource error:', error);
    // Clear the timeout if we get an error
    clearTimeout(timeoutId);
    
    const errorEvent: ErrorEvent = {
      type: 'error',
      message: `EventSource error: ${String(error)}`
    };
    
    handlers.onError?.(errorEvent);
    console.error('EventSource error:', error);
    eventSource.close();
  };
  
  // Return cleanup function
  return () => {
    console.log('Cleaning up EventSource');
    clearTimeout(timeoutId);
    controller.abort();
    eventSource.close();
  };
}
