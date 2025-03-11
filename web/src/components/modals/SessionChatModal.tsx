'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, useSessionMessages, useSendMessage, useSessionStream } from '@/hooks/api';
import { useSessionStore } from '@/stores';

// Message format from history endpoint
interface Message {
  id?: string;
  role: 'user' | 'assistant' | string;
  content: string;
  timestamp?: string;
  createdAt: string;
}

interface SessionHistoryResponse {
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

interface SessionChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

export default function SessionChatModal({ isOpen, onClose, sessionId }: SessionChatModalProps) {
  // Get session details
  const { data: session, isLoading: isLoadingSession } = useSession(sessionId);
  
  // Get messages for this session
  const { data: messagesData, isLoading: isLoadingMessages, refetch: refetchMessages } = useSessionMessages(sessionId);
  
  // Send message mutation
  const sendMessage = useSendMessage();
  
  // Local state for message input
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Ref for message container to auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // For streaming updates
  const {
    isConnected,
    isComplete,
    turns: streamingTurns,
    error: streamingError,
    connect: connectStream,
    disconnect: disconnectStream,
    reset: resetStream
  } = useSessionStream({
    sessionId,
    workspaceId: '',  // Empty for system sessions
    autoConnect: false
  });
  
  // Transform history data into a flat list of messages
  const messagesFromHistory = (historyData: SessionHistoryResponse | undefined) => {
    if (!historyData) return [];
    
    const messages: Message[] = [];
    
    historyData.rounds.forEach(round => {
      // Add user message from request
      messages.push({
        id: round.request.id,
        role: 'user',
        content: round.request.content,
        createdAt: round.request.createdAt
      });
      
      // Add assistant responses from turns
      round.response.turns.forEach(turn => {
        messages.push({
          id: turn.id,
          role: 'assistant',
          content: turn.content,
          createdAt: turn.createdAt
        });
      });
    });
    
    // Sort by timestamp
    return messages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  };
  
  // Process messages from history
  const messages = messagesFromHistory(messagesData);
  
  // Handle closing chat modal - cleanup resources
  useEffect(() => {
    if (!isOpen && isConnected) {
      // Disconnect streaming when modal closes
      disconnectStream();
    }
    
    // Cleanup on unmount
    return () => {
      disconnectStream();
    };
  }, [isOpen, isConnected, disconnectStream]);
  
  // Reset streaming state when complete
  useEffect(() => {
    if (isComplete) {
      // When stream completes, refetch messages to get the final state
      refetchMessages();
    }
  }, [isComplete, refetchMessages]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messagesData, streamingTurns]);
  
  // Send message and handle streaming
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending || isStreaming) return;
    
    setIsSending(true);
    
    try {
      // Connect to stream first to catch the response
      connectStream();
      
      // Send message through streaming API
      await sendMessage.mutateAsync({
        sessionId,
        message: newMessage
      });
      
      // Clear input
      setNewMessage('');
      
      // Wait for streaming to complete then refresh message history
      setTimeout(() => {
        if (!isComplete) {
          refetchMessages();
        }
      }, 1000);
    } catch (error) {
      console.error('Failed to send message:', error);
      disconnectStream();
      refetchMessages();
    } finally {
      setIsSending(false);
    }
  };
  
  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };
  
  if (!isOpen) return null;
  
  // Show streaming indicators
  const isStreaming = isConnected && !isComplete;
  
  // Message list including both history and streaming
  const allMessages = [...messages];
  
  // Add latest streaming content if it exists
  if (streamingTurns.length > 0 && isStreaming) {
    const lastStreamingTurn = streamingTurns[streamingTurns.length - 1];
    
    // Add streaming message if it's not already in the history
    const existingMsgIndex = allMessages.findIndex(
      msg => msg.id === lastStreamingTurn.turnId
    );
    
    if (existingMsgIndex === -1) {
      allMessages.push({
        id: lastStreamingTurn.turnId,
        role: 'assistant',
        content: lastStreamingTurn.content,
        createdAt: new Date().toISOString()
      });
    } else {
      // Update existing message with new content
      allMessages[existingMsgIndex].content = lastStreamingTurn.content;
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-4xl h-[80vh] flex flex-col m-4 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold truncate">
            {isLoadingSession ? 'Loading...' : session?.title}
          </h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Messages area */}
        <div className="flex-1 p-4 overflow-y-auto">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Loading messages...</p>
            </div>
          ) : allMessages.length > 0 ? (
            <div className="space-y-4">
              {allMessages.map((message, index) => (
                <div 
                  key={message.id || index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-bold">{message.role === 'user' ? 'You' : 'Assistant'}</span>
                      <span className="text-xs opacity-70 ml-2">
                        {formatTime(message.timestamp || message.createdAt)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No messages yet. Start a conversation!</p>
            </div>
          )}
        </div>
        
        {/* Input area */}
        <div className="p-4 border-t dark:border-gray-700">
          <form onSubmit={handleSendMessage} className="flex flex-col space-y-2">
            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 resize-none"
                placeholder={isStreaming ? "AI is responding..." : "Type your message..."}
                disabled={isSending || isStreaming}
                rows={3}
                onKeyDown={(e) => {
                  // Submit on Ctrl+Enter or Command+Enter
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleSendMessage(e as unknown as React.FormEvent);
                  }
                }}
              />
              <div className="text-xs text-gray-500 mt-1">
                Press Ctrl+Enter or Command+Enter to send
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSending || isStreaming || !newMessage.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isSending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
