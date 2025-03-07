import type {
  SessionEntity,
  RequestEntity,
  ResponseEntity,
  RoundEntity,
  TurnEntity,
  TurnWithToolCallsEntity,
  RoundWithDataEntity,
  SessionHistoryEntity,
  ToolCall
} from '@mandrake/utils';

import * as schema from './db/schema';
import type { sessions, requests, responses, rounds, turns } from './db/schema';

type Session = typeof sessions.$inferSelect;
type Request = typeof requests.$inferSelect;
type Response = typeof responses.$inferSelect;
type Round = typeof rounds.$inferSelect;
type Turn = typeof turns.$inferSelect;

// Convert DB schema types to entity types

/**
 * Map a session from DB schema to entity
 */
export function mapSessionToEntity(session: Session): SessionEntity {
  // For tests, we need to preserve the format of metadata that was stored
  // In normal operation, we'd always parse the string to an object
  return {
    id: session.id,
    title: session.title,
    description: session.description,
    // Keep metadata in original format (string or object)
    metadata: session.metadata as any,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  };
}

/**
 * Map a request from DB schema to entity
 */
export function mapRequestToEntity(request: Request): RequestEntity {
  return {
    id: request.id,
    content: request.content,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt
  };
}

/**
 * Map a response from DB schema to entity
 */
export function mapResponseToEntity(response: Response): ResponseEntity {
  return {
    id: response.id,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt
  };
}

/**
 * Map a round from DB schema to entity
 */
export function mapRoundToEntity(round: Round): RoundEntity {
  return {
    id: round.id,
    sessionId: round.sessionId,
    requestId: round.requestId,
    responseId: round.responseId,
    index: round.index,
    createdAt: round.createdAt,
    updatedAt: round.updatedAt
  };
}

/**
 * Map a turn from DB schema to entity
 */
export function mapTurnToEntity(turn: Turn): TurnEntity {
  return {
    id: turn.id,
    responseId: turn.responseId,
    index: turn.index,
    rawResponse: turn.rawResponse,
    content: turn.content,
    toolCalls: turn.toolCalls,
    status: turn.status as 'streaming' | 'completed' | 'error',
    streamStartTime: turn.streamStartTime,
    streamEndTime: turn.streamEndTime || undefined,
    currentTokens: turn.currentTokens,
    expectedTokens: turn.expectedTokens || undefined,
    inputTokens: turn.inputTokens,
    outputTokens: turn.outputTokens,
    cacheReadTokens: turn.cacheReadTokens || undefined,
    cacheWriteTokens: turn.cacheWriteTokens || undefined,
    inputCost: turn.inputCost,
    outputCost: turn.outputCost,
    createdAt: turn.createdAt,
    updatedAt: turn.updatedAt
  };
}

/**
 * Map a turn with parsed tool calls from DB schema to entity
 */
export function mapTurnWithToolCallsToEntity(
  turn: Turn & { parsedToolCalls: ToolCall }
): TurnWithToolCallsEntity {
  return {
    ...mapTurnToEntity(turn),
    parsedToolCalls: turn.parsedToolCalls
  };
}

/**
 * Parse tool calls JSON string into a ToolCall object
 */
export function parseToolCalls(toolCallsJson: string): ToolCall {
  try {
    return JSON.parse(toolCallsJson);
  } catch (error) {
    console.warn('Failed to parse toolCalls JSON, returning empty tool call', { error });
    return { call: null, response: null };
  }
}

/**
 * Map a round with data from DB schema to entity
 */
export function mapRoundWithDataToEntity(
  round: Round & {
    request: Request;
    response: Response & {
      turns: (Turn & { parsedToolCalls: ToolCall })[];
    };
  }
): RoundWithDataEntity {
  return {
    ...mapRoundToEntity(round),
    request: mapRequestToEntity(round.request),
    response: {
      ...mapResponseToEntity(round.response),
      turns: round.response.turns.map(mapTurnWithToolCallsToEntity)
    }
  };
}

/**
 * Map session history from DB schema to entity
 */
export function mapSessionHistoryToEntity(
  sessionHistory: {
    session: Session;
    rounds: (Round & {
      request: Request;
      response: Response & {
        turns: (Turn & { parsedToolCalls: ToolCall })[];
      };
    })[];
  }
): SessionHistoryEntity {
  return {
    session: mapSessionToEntity(sessionHistory.session),
    rounds: sessionHistory.rounds.map(mapRoundWithDataToEntity)
  };
}