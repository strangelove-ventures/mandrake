import { PrismaClient } from '@prisma/client';
import { Message, MessageRole } from '@mandrake/types';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';

// Define the type based on our schema
interface DBMessage {
    id: string;
    role: string;
    content: string;
    metadata?: any;
    conversationId: string;
    createdAt: Date;
}

export function toLangChainMessage(dbMessage: DBMessage): BaseMessage {
    let content;
    try {
        content = JSON.parse(dbMessage.content);
    } catch {
        content = dbMessage.content;
    }

    switch (dbMessage.role) {
        case 'user':
            return new HumanMessage(content);
        case 'assistant':
            return new AIMessage(content);
        case 'system':
            return new SystemMessage(content);
        default:
            throw new Error(`Unknown message role: ${dbMessage.role}`);
    }
}

export function toDBMessage(message: BaseMessage): Omit<Message, 'id' | 'conversationId' | 'createdAt'> {
    return {
        role: message._getType() as MessageRole,
        content: typeof message.content === 'string'
            ? message.content
            : JSON.stringify(message.content),
        metadata: message.additional_kwargs
    };
}