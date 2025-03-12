/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useSession, useSessionMessages, useSendMessage, usePollingUpdates, useSessionPrompt } from '@/hooks/api';
import { useSessionStreamQuery } from '@/hooks/api/useSessionStreamQuery'; // Import the new hook
import { 
  MessageList, 
  ChatInput, 
  messagesFromHistory, 
  addStreamingData,
  addUserMessage,
  Message
} from '@/components/shared/chat';

interface SessionChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  workspaceId?: string;
}

export default function SessionChatModal({ isOpen, onClose, sessionId, workspaceId }: SessionChatModalProps) {
  // Get session details
  const { data: session, isLoading: isLoadingSession } = useSession(sessionId, workspaceId);
  
  // Get messages for this session
  const { data: messagesData, isLoading: isLoadingMessages, refetch: refetchMessages } = useSessionMessages(sessionId, workspaceId);
  
  // Send message mutation
  const sendMessage = useSendMessage(workspaceId);
  
  // Local state
  const [isSending, setIsSending] = useState(false);
  const [userMessage, setUserMessage] = useState<Message | null>(null);
  
  // State for error handling and retries
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // State for system prompt modal
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  
  // Get system prompt - lazy loaded when needed
  const { data: promptData, isLoading: isLoadingPrompt, refetch: refetchPrompt } = useSessionPrompt(
    sessionId,
    workspaceId || ''
  );
  
  // Use our new React Query based streaming hook instead of useSessionStream
  const {
    isConnected,
    isComplete,
    turns: streamingTurns,
    error: streamingError,
    connect: connectStream,
    disconnect: disconnectStream,
    // reset: resetStream
  } = useSessionStreamQuery({
    sessionId,
    workspaceId: workspaceId || '',
    autoConnect: false
  });
  
  // For polling updates (fallback for streaming)
  const {
    data: pollingData,
    isPolling,
    startPolling,
    stopPolling
  } = usePollingUpdates({
    sessionId,
    workspaceId: workspaceId || '',
    enabled: false,   // Only enable when streaming fails
    interval: 1000    // Poll every second
  });

  // Reset user message and error state when switching sessions
  useEffect(() => {
    // Clear temporary states when session ID changes
    setUserMessage(null);
    setError(null);
    setRetryCount(0);
  }, [sessionId]);
  
  // Make sure user message is removed when there's an error or when history updates
  useEffect(() => {
    if (messagesData || error) {
      // Once we have real message history or an error, remove the temporary message
      setUserMessage(null);
    }
  }, [messagesData, error]);
  
  // Check if error is related to API key or configuration
  const isAPIKeyError = error ? (error.includes('API key') || error.includes('authentication')) : false;
  
  // Parse error messages to show more helpful information
  const getFormattedErrorMessage = (error: any): string => {
    if (!error) return 'An unknown error occurred';
    
    const errorString = String(error);
    
    // Check for common error types
    if (errorString.includes('authentication_error') || errorString.includes('invalid x-api-key')) {
      return 'Invalid or missing API key. Please check your model configuration.';
    }
    
    if (errorString.includes('socket hang up') || errorString.includes('ECONNRESET')) {
      return 'Connection to the AI service was interrupted. The response may appear after refreshing.';
    }
    
    if (errorString.includes('timeout') || errorString.includes('timed out')) {
      return 'Request timed out. The AI model may be overloaded, please try again later.';
    }
    
    // Default case
    return errorString;
  };
  
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
      setError(`Streaming error: ${getFormattedErrorMessage(streamingError)}`);
      
      // Switch to polling mode if streaming fails
      console.log('Streaming failed, falling back to polling mode');
      startPolling();
      
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
  
  // Process messages from history - use polling data if available
  const messages = messagesFromHistory(pollingData || messagesData);
  
  // Handle closing chat modal - cleanup resources
  useEffect(() => {
    if (!isOpen && isConnected) {
      // Disconnect streaming when modal closes
      disconnect();
    }
    
    if (!isOpen && isPolling) {
      // Stop polling when modal closes
      stopPolling();
    }
    
    // Cleanup on unmount
    return () => {
      disconnect();
      stopPolling();
    };
  }, [isOpen, isConnected, isPolling]);
  
  // Reset streaming state when complete
  useEffect(() => {
    if (isComplete) {
      // When stream completes, refetch messages to get the final state
      fetchHistoryFallback();
      setUserMessage(null);
      
      // Stop polling when streaming completes successfully
      if (isPolling) {
        stopPolling();
      }
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
      const tempUserMessage = {
        id: 'temp-user-' + Date.now(),
        role: 'user',
        content: messageText,
        createdAt: new Date().toISOString()
      };
      
      setUserMessage(tempUserMessage);
      
      // Set up a fallback timer to fetch messages if streaming fails
      const fallbackTimer = setTimeout(() => {
        console.log('Fallback timer triggered');
        if (isStreaming && streamingTurns.length === 0) {
          console.log('No streaming turns received, falling back to history');
          fetchHistoryFallback();
        }
      }, 5000); // 5 second fallback
      
      // Connect to stream first to catch the response using new hook
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
      setError(`Error sending message: ${getFormattedErrorMessage(error)}`);
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
  const isStreaming = (isConnected && !isComplete) || isPolling;
    
  // All messages including pending user message and streaming responses
  const messagesWithoutUserMessage = [...messages];
  
  // Add streaming responses
  const messagesWithStreaming = addStreamingData(messagesWithoutUserMessage, streamingTurns, isStreaming);
  
  // Add pending user message if it exists - do this last to avoid duplicating in history
  const allMessages = addUserMessage(messagesWithStreaming, userMessage);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-4xl h-[80vh] flex flex-col m-4 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold truncate">
            {isLoadingSession ? 'Loading...' : session?.title}
          </h2>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setShowSystemPrompt(true);
                refetchPrompt();
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm flex items-center gap-1"
              title="View System Prompt"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>System Prompt</span>
            </button>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded mx-4 mt-4">
            {error}
            <div className="mt-2 flex gap-2">
              <button 
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-xs"
                onClick={() => {
                  setError(null);
                  if (retryCount < 3) {
                    fetchHistoryFallback();
                  }
                }}
              >
                Refresh
              </button>
              
              {isAPIKeyError && (
                <button 
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                  onClick={() => {
                    // Open the models configuration page
                    window.location.href = '/system/models';
                  }}
                >
                  Configure Model
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Messages area */}
        <div className="flex-1 p-4 overflow-y-auto">
          <MessageList 
            messages={allMessages}
            isLoading={isLoadingMessages}
            isStreaming={isStreaming && streamingTurns.length === 0}
            hasError={error !== null}
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
      
      {/* System Prompt Modal */}
      {showSystemPrompt && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col m-4 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
              <h3 className="text-xl font-bold">System Prompt</h3>
              <button 
                onClick={() => setShowSystemPrompt(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 p-4 overflow-auto">
              {isLoadingPrompt ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                </div>
              ) : promptData ? (
                <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto">
                  {promptData.systemPrompt}
                </pre>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  Error loading system prompt. Please try again.
                </div>
              )}
            </div>
            
            <div className="flex justify-end p-4 border-t dark:border-gray-700">
              <button 
                onClick={() => setShowSystemPrompt(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}