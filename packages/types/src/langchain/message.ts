export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface Message {
    id: string;
    role: MessageRole;
    content: string;
    metadata?: Record<string, unknown>;
    conversationId: string;
    createdAt: Date;
}