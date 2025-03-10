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
    
  const url = `${baseUrl}/workspaces/${workspaceId}/streaming/sessions/${sessionId}`;
  
  // Create the EventSource
  const eventSource = new EventSource(url);
  
  // Handle incoming messages
  eventSource.onmessage = (event) => {
    try {
      // Parse the event data
      const data = JSON.parse(event.data) as StreamEventUnion;
      
      // Call the generic event handler if provided
      handlers.onEvent?.(data);
      
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
    eventSource.close();
  };
}