'use client';

import { useState } from 'react';
import { useSessions } from '@/hooks/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CreateSessionModal from '@/components/modals/CreateSessionModal';

interface WorkspaceSessionListProps {
  workspaceId: string;
  onSelectSession: (sessionId: string) => void;
}

export default function WorkspaceSessionList({ workspaceId, onSelectSession }: WorkspaceSessionListProps) {
  // Get sessions from API
  const { data: sessions, isLoading, error, refetch } = useSessions(workspaceId);
  
  // State for create modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Handle modal opening and closing
  const openCreateModal = () => setIsCreateModalOpen(true);
  const closeCreateModal = () => setIsCreateModalOpen(false);
  
  // After session creation
  const handleSessionCreated = () => {
    refetch();
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Workspace Sessions</CardTitle>
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
          workspaceId={workspaceId}
        />
      </CardHeader>
      
      <CardContent>
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
              {isLoading ? (
                // Loading skeleton
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b dark:border-gray-700">
                    <td className="py-3 px-4">
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-10 animate-pulse"></div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                    </td>
                  </tr>
                ))
              ) : sessions?.sort((a, b) => {
                // Sort by createdAt date (newest first)
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              }).map(session => (
                <tr 
                  key={session.id}
                  className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => onSelectSession(session.id)}
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
              
              {(!sessions || sessions.length === 0) && !isLoading && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-500">
                    No sessions found. Create a new session to get started.
                  </td>
                </tr>
              )}
              
              {error && !isLoading && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-red-500">
                    <div className="flex flex-col gap-2">
                      <p>Error loading sessions: {String(error)}</p>
                      <p className="text-sm">
                        The workspace service may not be properly initialized. Try refreshing the page or returning to the home page.
                      </p>
                      <button 
                        onClick={() => refetch()}
                        className="px-4 py-2 mt-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-32 mx-auto"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}