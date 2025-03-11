'use client';

import { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';

export interface Message {
  id?: string;
  role: 'user' | 'assistant' | string;
  content: string;
  timestamp?: string;
  createdAt: string;
}

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
  
  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id || index}
          content={message.content}
          role={message.role}
          timestamp={message.timestamp || message.createdAt}
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
