/**
 * Session entity interface
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
 * Request entity interface
 */
export interface RequestEntity {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Response entity interface
 */
export interface ResponseEntity {
  id: string;
  turns?: TurnEntity[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Round entity interface
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
 * Round with related data entity interface
 */
export interface RoundWithDataEntity extends RoundEntity {
  request: RequestEntity;
  response: ResponseEntity & {
    turns: TurnWithToolCallsEntity[];
  };
}

/**
 * Session tool call interface
 */
export interface SessionToolCall {
  call: any | null;
  response?: any | null;
}

/**
 * Turn entity interface
 */
export interface TurnEntity {
  id: string;
  responseId: string;
  index: number;
  rawResponse: string;
  content: string;
  toolCalls: string;
  status: 'streaming' | 'completed' | 'error';
  streamStartTime: number;
  streamEndTime?: number;
  currentTokens: number;
  expectedTokens?: number;
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
 * Turn with parsed tool calls entity interface
 */
export interface TurnWithToolCallsEntity extends TurnEntity {
  parsedToolCalls: SessionToolCall;
}

/**
 * Session history entity interface
 */
export interface SessionHistoryEntity {
  session: SessionEntity;
  rounds: RoundWithDataEntity[];
}