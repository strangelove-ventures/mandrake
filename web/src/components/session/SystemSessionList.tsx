/**
 * System sessions list component for the landing page
 */
'use client';

import { useEffect, useState } from 'react';
import { useSessions } from '@/hooks/api';
import { useSessionStore } from '@/stores';
import CreateSessionModal from '@/components/modals/CreateSessionModal';
import SessionChatModal from '@/components/modals/SessionChatModal';

export default function SystemSessionList() {
  // Get sessions from API
  const { data: sessions, isLoading, error, refetch } = useSessions();
  
  // State for modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  
  // Get the session store
  const sessionStore = useSessionStore();
  
  // Load sessions on mount
  useEffect(() => {
    refetch();
  }, [refetch]);
  
  // Handle modal opening and closing
  const openCreateModal = () => setIsCreateModalOpen(true);
  const closeCreateModal = () => setIsCreateModalOpen(false);
  
  // After session creation
  const handleSessionCreated = () => {
    refetch();
  };
  
  // Handle opening chat modal
  const handleSessionClick = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setIsChatModalOpen(true);
    
    // Also set as current session in the store
    // Using direct method name known to exist in the store
    sessionStore.setCurrentSession(sessionId);
  };
  
  // Handle closing chat modal
  const handleCloseChatModal = () => {
    setIsChatModalOpen(false);
  };
  
  if (isLoading) return <div className="p-4">Loading sessions...</div>;
  if (error) return <div className="p-4 text-red-500">Error loading sessions: {String(error)}</div>;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">System Sessions</h2>
        
        <button 
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          New Session
        </button>
        
        {/* Session creation modal */}
        <CreateSessionModal
          isOpen={isCreateModalOpen}
          onClose={closeCreateModal}
          onSuccess={handleSessionCreated}
        />
      </div>
      
      {/* Sessions list */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="pb-3 px-4">Name</th>
              <th className="pb-3 px-4">Messages</th>
              <th className="pb-3 px-4">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {sessions?.sort((a, b) => {
              // Sort by createdAt date (newest first)
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }).map(session => (
              <tr 
                key={session.id}
                className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => handleSessionClick(session.id)}
              >
                <td className="py-3 px-4">
                  <span className="font-medium text-blue-600 dark:text-blue-400">{session.title}</span>
                </td>
                <td className="py-3 px-4">
                  {session.messageCount || 0}
                </td>
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                  {new Date(session.updatedAt || session.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            
            {(!sessions || sessions.length === 0) && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-gray-500">
                  No sessions found. Create a new session to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Session chat modal */}
      {selectedSessionId && (
        <SessionChatModal
          isOpen={isChatModalOpen}
          onClose={handleCloseChatModal}
          sessionId={selectedSessionId}
        />
      )}
    </div>
  );
}
