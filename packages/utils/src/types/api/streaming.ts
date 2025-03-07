/**
 * Streaming API types
 * 
 * Types for server-sent events and streaming responses
 */

/**
 * Types of streaming events
 */
export type StreamEventType = 
  | 'initialized'   // Stream started
  | 'turn'          // Turn update (content added)
  | 'turn-completed' // Turn finished
  | 'completed'     // Stream completed
  | 'error';        // Error occurred

/**
 * Base interface for all stream events
 */
export interface StreamEvent {
  /** Type of event */
  type: StreamEventType;
}

/**
 * Initialization event when stream starts
 */
export interface StreamInitEvent extends StreamEvent {
  type: 'initialized';
  /** Session ID */
  sessionId: string;
  /** Response ID for the generated response */
  responseId: string;
}

/**
 * Tool call object in a turn
 */
export interface ToolCallObject {
  /** Server name */
  serverName: string;
  /** Method name */
  methodName: string;
  /** Arguments as a record */
  arguments: Record<string, any>;
}

/**
 * Turn update event with new content
 */
export interface TurnEvent extends StreamEvent {
  type: 'turn';
  /** Turn ID */
  turnId: string;
  /** Index of the turn in the response */
  index: number;
  /** Current content */
  content: string;
  /** Current turn status */
  status: 'streaming' | 'completed' | 'error';
  /** Tool calls if any */
  toolCalls: { call: ToolCallObject | null; response?: any }[];
}

/**
 * Turn completed event
 */
export interface TurnCompletedEvent extends StreamEvent {
  type: 'turn-completed';
  /** Turn ID */
  turnId: string;
  /** Final status */
  status: 'completed' | 'error';
}

/**
 * Stream completed event
 */
export interface CompletedEvent extends StreamEvent {
  type: 'completed';
  /** Session ID */
  sessionId: string;
  /** Response ID */
  responseId: string;
}

/**
 * Error event
 */
export interface ErrorEvent extends StreamEvent {
  type: 'error';
  /** Error message */
  message: string;
}

/**
 * Union type for all possible stream events
 */
export type StreamEventUnion = 
  | StreamInitEvent
  | TurnEvent
  | TurnCompletedEvent
  | CompletedEvent
  | ErrorEvent;