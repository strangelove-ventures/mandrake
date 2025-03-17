/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Shared types for chat components
 */

export interface Message {
  id?: string;
  role: 'user' | 'assistant' | string;
  content: string;
  timestamp?: string;
  createdAt: string;
  index?: number;
}

// Extended message type for responses that have multiple turns
export interface ResponseMessage extends Message {
  responseId: string;
  turns: ResponseTurn[];
}

// Turn within a response
export interface ResponseTurn extends Message {
  turnId?: string;
  responseId: string;
  index?: number;
  rawResponse?: string; // Raw response containing tool calls
  toolCalls?: string;
  status?: string;
}

export interface SessionHistoryResponse {
  session: {
    id: string;
    title: string;
    description?: string;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt?: string;
  };
  rounds: Array<{
    id: string;
    request: {
      id: string;
      content: string;
      createdAt: string;
    };
    response: {
      id: string;
      turns: Array<{
        id: string;
        index: number;
        content: string;
        rawResponse?: string;
        toolCalls?: string;
        status?: string;
        createdAt: string;
      }>;
    };
  }>;
}

export interface StreamingTurn {
  turnId: string;
  content: string;
  index: number;
  status: string;
  rawResponse?: string;
  toolCalls?: string;
}

// Response with tool calls for display
export interface ToolCallResponse {
  responseId: string;
  toolCalls: any[];
}