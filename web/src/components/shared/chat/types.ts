/**
 * Shared types for chat components
 */

export interface Message {
  id?: string;
  role: 'user' | 'assistant' | string;
  content: string;
  timestamp?: string;
  createdAt: string;
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
        content: string;
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
}
