'use client';

import { useState, useEffect } from 'react';
import { useSession, useSessionMessages, useSendMessage, useSessionStream } from '@/hooks/api';
import { useSessionStore } from '@/stores';
import { 
  MessageList, 
  ChatInput, 
  messagesFromHistory, 
  addStreamingData,
  Message
} from '@/components/shared/chat';

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
  
  // Local state
  const [isSending, setIsSending] = useState(false);
  const [userMessage, setUserMessage] = useState<Message | null>(null);
  
  // State for error handling and retries
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // For streaming updates
  const {
    isConnected,
    isComplete,
    turns: streamingTurns,
    error: streamingError,
    connect: connectStream,
    disconnect: disconnectStream
  } = useSessionStream({
    sessionId,
    workspaceId: '',  // Empty for system sessions
    autoConnect: false
  });
  
  // Fallback history fetching when streaming fails
  const fetchHistoryFallback = async () => {
    try {
      console.log('Fetching message history as fallback');
      await refetchMessages();
      console.log('Fallback history fetch complete');
    } catch (err) {
      console.error('Error fetching fallback history:', err);
      setError(`Could not load messages: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  // Handle errors in streaming
  useEffect(() => {
    if (streamingError) {
      console.error('Streaming error:', streamingError);
      setError(`Streaming error: ${streamingError.message}`);
      
      // Automatically refetch messages after a streaming error
      const timer = setTimeout(() => {
        fetchHistoryFallback();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [streamingError]);
  
  // Add a useEffect to log streaming events for debugging
  useEffect(() => {
    if (isConnected) {
      console.log('Streaming connected, isComplete:', isComplete);
      console.log('Number of streaming turns:', streamingTurns.length);
      if (streamingTurns.length > 0) {
        console.log('Latest turn:', streamingTurns[streamingTurns.length - 1]);
      }
    }
  }, [isConnected, isComplete, streamingTurns]);
  
  // Process messages from history
  const messages = messagesFromHistory(messagesData);
  
  // Handle closing chat modal - cleanup resources
  useEffect(() => {
    if (!isOpen && isConnected) {
      // Disconnect streaming when modal closes
      disconnect();
    }
    
    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [isOpen, isConnected]);
  
  // Reset streaming state when complete
  useEffect(() => {
    if (isComplete) {
      // When stream completes, refetch messages to get the final state
      fetchHistoryFallback();
      setUserMessage(null);
    }
  }, [isComplete]);
  
  // Send message and connect to streaming
  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isSending || isStreaming) return;
    
    setIsSending(true);
    console.log('Sending message:', message);
    
    try {
      // Store the message text
      const messageText = message.trim();
      
      // Add user message locally for immediate feedback
      setUserMessage({
        id: 'temp-user-' + Date.now(),
        role: 'user',
        content: messageText,
        createdAt: new Date().toISOString()
      });
      
      // Set up a fallback timer to fetch messages if streaming fails
      const fallbackTimer = setTimeout(() => {
        console.log('Fallback timer triggered');
        if (isStreaming && streamingTurns.length === 0) {
          console.log('No streaming turns received, falling back to history');
          fetchHistoryFallback();
        }
      }, 5000); // 5 second fallback
      
      // Connect to stream first to catch the response
      console.log('Connecting to stream for', sessionId);
      connectStream();
      
      // Clear any previous error
      setError(null);
      
      // Send message through streaming API
      console.log('Sending API request to', sessionId);
      await sendMessage.mutateAsync({
        sessionId,
        message: messageText
      });
      console.log('Message sent, waiting for response');
      
      // Clear the fallback timer if the request completes successfully
      clearTimeout(fallbackTimer);
      
      // Wait for streaming to complete then refresh message history
      setTimeout(() => {
        if (!isComplete) {
          console.log('Stream not complete, refreshing messages');
          fetchHistoryFallback();
        }
      }, 1000);
    } catch (error) {
      console.error('Failed to send message:', error);
      setError(`Error sending message: ${error instanceof Error ? error.message : String(error)}`);
      disconnect();
      
      // Use the fallback method to get updated messages
      fetchHistoryFallback();
      setUserMessage(null);
      
      // Increment retry count to avoid infinite loops
      setRetryCount(count => count + 1);
    } finally {
      setIsSending(false);
    }
  };
  
  // Shorthand for disconnecting stream
  const disconnect = () => {
    disconnectStream();
  };
  
  if (!isOpen) return null;
  
  // Show streaming indicators
  const isStreaming = isConnected && !isComplete;
  
  // All messages including pending user message and streaming responses
  const allMessages = [...messages];
  
  // Add pending user message if it exists
  if (userMessage) {
    allMessages.push(userMessage);
  }
  
  // Add streaming responses
  const messagesWithStreaming = addStreamingData(allMessages, streamingTurns, isStreaming);
  
  // Log any differences between allMessages and messagesWithStreaming
  const streamingAdded = messagesWithStreaming.length > allMessages.length;
  if (streamingAdded) {
    console.log('Streaming data added to messages:', 
      messagesWithStreaming.length - allMessages.length, 
      'message(s)');
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
        
        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded mx-4 mt-4">
            {error}
            <button 
              className="ml-2 underline"
              onClick={() => {
                setError(null);
                if (retryCount < 3) {
                  fetchHistoryFallback();
                }
              }}
            >
              Refresh
            </button>
          </div>
        )}
        
        {/* Messages area */}
        <div className="flex-1 p-4 overflow-y-auto">
          <MessageList 
            messages={messagesWithStreaming}
            isLoading={isLoadingMessages}
            isStreaming={isStreaming && streamingTurns.length === 0}
          />
        </div>
        
        {/* Input area */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isDisabled={isSending}
          isStreaming={isStreaming}
          placeholder="Type your message..."
        />
      </div>
    </div>
  );
}
