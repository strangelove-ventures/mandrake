'use client';

import { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { Message, ResponseMessage } from './types';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  isStreaming?: boolean;
  hasError?: boolean;
}

export function MessageList({
  messages,
  isLoading = false,
  isStreaming = false,
  hasError = false
}: MessageListProps) {
  // Ref for auto-scrolling to the bottom
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading messages...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No messages yet. Start a conversation!</p>
      </div>
    );
  }

  // Group messages by role and response ID (for assistant messages)
  const groupedMessages = messages.reduce<(Message | ResponseMessage)[]>((acc, message) => {
    if (message.role === 'user') {
      // User messages are passed through directly
      acc.push(message);
    } else if (message.role === 'assistant') {
      // For assistant messages, check if we already have a response with this ID
      const responseMessage = message as ResponseMessage;
      const responseId = responseMessage.responseId;

      if (!responseId) {
        // If no responseId, treat as a standalone message (legacy support)
        acc.push(message);
        return acc;
      }

      // Look for an existing grouped message with this responseId
      const existingIndex = acc.findIndex(
        (m) => m.role === 'assistant' &&
          'responseId' in m &&
          m.responseId === responseId
      );

      if (existingIndex >= 0) {
        // Add this turn to the existing response
        const existing = acc[existingIndex] as ResponseMessage;
        if (!existing.turns) existing.turns = [];
        existing.turns.push(responseMessage);

        // Sort turns by index if available
        if (responseMessage.index !== undefined) {
          existing.turns.sort((a, b) => (a.index || 0) - (b.index || 0));
        }
      } else {
        // Create a new response group
        const newResponseMessage: ResponseMessage = {
          id: responseId,
          responseId: responseId,
          role: 'assistant',
          content: responseMessage.content,
          createdAt: responseMessage.createdAt,
          turns: [responseMessage]
        };
        acc.push(newResponseMessage);
      }
    }

    return acc;
  }, []);

  return (
    <div className="space-y-4">
      {groupedMessages.map((message, index) => (
        <MessageBubble
          key={message.id || index}
          message={message}
        />
      ))}

      {isStreaming && (
        <TypingIndicator />
      )}

      {/* For when streaming abruptly disconnects */}
      {messages.length > 0 && messages[messages.length - 1].role === 'user' && !isStreaming && !isLoading && !hasError && (
        <div className="flex justify-start italic opacity-70 text-sm">
          AI is still processing your request...
          <div className="ml-2 flex items-center">
            <div className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-pulse"></div>
            <div className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-pulse ml-1" style={{ animationDelay: '0.2s' }}></div>
            <div className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-pulse ml-1" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}