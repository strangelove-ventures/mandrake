/**
 * Session component to demonstrate streaming API
 */
'use client';

import { useState } from 'react';
import { useSessionStream } from '@/hooks/api';
import { useSessionStore, useWorkspaceStore } from '@/stores';

export default function SessionDemo() {
  const [message, setMessage] = useState('');
  const { currentSessionId, createNewSession } = useSessionStore();
  const { currentWorkspaceId } = useWorkspaceStore();
  
  // Demo streaming - only active if both session and workspace are set
  const showStream = Boolean(currentSessionId && currentWorkspaceId);
  
  // Stream state
  const {
    isConnected, 
    isComplete,
    turns,
    error,
    connect,
    disconnect
  } = useSessionStream({
    sessionId: currentSessionId || '',
    workspaceId: currentWorkspaceId || '',
    autoConnect: showStream
  });
  
  // Create new session
  const handleCreateSession = async () => {
    await createNewSession();
  };
  
  // Toggle streaming
  const toggleStreaming = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };
  
  // Demo UI
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <h2 className="text-xl font-bold mb-4">Session Demo</h2>
      
      {/* Session info */}
      <div className="mb-4">
        <p className="mb-2">
          <strong>Current workspace:</strong> {currentWorkspaceId || 'None selected'}
        </p>
        <p className="mb-2">
          <strong>Current session:</strong> {currentSessionId || 'None selected'}
        </p>
        
        {!currentSessionId && (
          <button 
            onClick={handleCreateSession}
            disabled={!currentWorkspaceId}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Create Session
          </button>
        )}
      </div>
      
      {/* Streaming */}
      {showStream && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Streaming Demo</h3>
            <button
              onClick={toggleStreaming}
              className={`px-3 py-1 rounded text-white ${
                isConnected ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {isConnected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
          
          {/* Stream status */}
          <div className="mb-2 text-sm">
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
              isConnected ? 'bg-green-500' : 'bg-gray-500'
            }`}></span>
            Status: {isConnected ? 'Connected' : 'Disconnected'}
            {isComplete && ' (Complete)'}
          </div>
          
          {/* Stream content */}
          <div className="border rounded-md p-3 min-h-[100px] mb-3 bg-gray-50 dark:bg-gray-900 overflow-auto">
            {turns.length > 0 ? (
              turns.map((turn) => (
                <div key={turn.turnId} className="mb-2">
                  <pre className="whitespace-pre-wrap font-mono text-sm">{turn.content}</pre>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                {isConnected ? 'Waiting for data...' : 'Connect to start streaming'}
              </p>
            )}
            
            {error && (
              <div className="text-red-500 mt-2">
                Error: {error.message}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}