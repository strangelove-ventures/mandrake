import type { ToolCall } from '../workspace/tools-internal';

/**
 * Session entity representing a conversation session
 */
export interface SessionEntity {
  id: string;
  title: string | null;
  description: string | null;
  metadata: Record<string, string> | string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request entity representing a user message
 */
export interface RequestEntity {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Response entity representing an assistant response container
 */
export interface ResponseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Round entity representing a user-assistant exchange
 */
export interface RoundEntity {
  id: string;
  sessionId: string;
  requestId: string;
  responseId: string;
  index: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Turn entity representing a chunk of assistant response
 */
export interface TurnEntity {
  id: string;
  responseId: string;
  index: number;
  
  // Content fields
  rawResponse: string;
  content: string;
  toolCalls: string | ToolCall;
  
  // Streaming status fields
  status: 'streaming' | 'completed' | 'error';
  streamStartTime: number;
  streamEndTime?: number;
  currentTokens: number;
  expectedTokens?: number;
  
  // Token metrics
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  inputCost: number;
  outputCost: number;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Turn entity with parsed tool calls
 */
export interface TurnWithToolCallsEntity extends TurnEntity {
  parsedToolCalls: ToolCall;
}

/**
 * Round entity with request and response data
 */
export interface RoundWithDataEntity extends RoundEntity {
  request: RequestEntity;
  response: ResponseEntity & {
    turns: TurnWithToolCallsEntity[];
  };
}

/**
 * Session history entity with rounds data
 */
export interface SessionHistoryEntity {
  session: SessionEntity;
  rounds: RoundWithDataEntity[];
}