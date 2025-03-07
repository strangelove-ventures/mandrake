/**
 * Session API types
 * 
 * Types for session-related API operations
 */

import type { SessionEntity, RoundEntity, RoundWithDataEntity, TurnEntity, TurnWithToolCallsEntity, SessionHistoryEntity } from '../workspace';

/**
 * Session response object
 */
export interface SessionResponse extends Omit<SessionEntity, 'metadata'> {
  /** Session metadata as parsed object */
  metadata: Record<string, any>;
}

/**
 * Parameters for creating a new session
 */
export interface CreateSessionRequest {
  /** Session title */
  title?: string;
  /** Optional description */
  description?: string;
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Parameters for updating a session
 */
export interface UpdateSessionRequest {
  /** New title (optional) */
  title?: string;
  /** New description (optional) */
  description?: string;
  /** New metadata (optional) */
  metadata?: Record<string, any>;
}

/**
 * List of sessions response
 */
export type SessionListResponse = SessionResponse[];

/**
 * Round response object
 */
export interface RoundResponse extends RoundEntity {}

/**
 * Round with related data response
 */
export interface RoundWithDataResponse extends RoundWithDataEntity {}

/**
 * List of rounds response
 */
export type RoundListResponse = RoundResponse[];

/**
 * Turn response object
 */
export interface TurnResponse extends TurnEntity {}

/**
 * Turn with parsed tool calls response
 */
export interface TurnWithToolCallsResponse extends TurnWithToolCallsEntity {}

/**
 * List of turns response
 */
export type TurnListResponse = TurnResponse[];

/**
 * Session history response
 */
export interface SessionHistoryResponse extends SessionHistoryEntity {}

/**
 * Parameters for creating a new round
 */
export interface CreateRoundRequest {
  /** User message content */
  content: string;
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Parameters for streaming a request
 */
export interface StreamRequestRequest {
  /** User message content */
  content: string;
}

/**
 * Initial response when starting a stream
 */
export interface StreamRequestResponse {
  /** Session ID */
  sessionId: string;
  /** Response ID for the generated response */
  responseId: string;
}