'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/ui/Header';
import { useWorkspace } from '@/hooks/api';
import WorkspaceConfigPanel from '@/components/workspace/config/WorkspaceConfigPanel';
import WorkspaceSessionList from '@/components/workspace/WorkspaceSessionList';
import SessionChatModal from '@/components/modals/SessionChatModal';

export default function WorkspacePage() {
  const params = useParams();
  const workspaceId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  // Fetch workspace details
  const { data: workspace, isLoading: isLoadingWorkspace } = useWorkspace(workspaceId);
  
  // State for chat modal
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  
  // Handle session selection
  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setSessionModalOpen(true);
  };
  
  if (isLoadingWorkspace) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="container mx-auto p-4 md:p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="lg:col-span-1 h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-2">Workspace: {workspace?.name}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          {workspace?.description || 'No description provided'}
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Content (2/3) */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <WorkspaceSessionList 
              workspaceId={workspaceId} 
              onSelectSession={handleSelectSession}
            />
          </div>
          
          {/* Right Content (1/3) */}
          <div className="lg:col-span-1">
            <WorkspaceConfigPanel workspaceId={workspaceId} />
          </div>
        </div>
      </main>
      
      {/* Session Chat Modal */}
      {selectedSessionId && (
        <SessionChatModal
          isOpen={sessionModalOpen}
          onClose={() => setSessionModalOpen(false)}
          sessionId={selectedSessionId}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}
