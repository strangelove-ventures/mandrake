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
  const { data: workspace, isLoading: isLoadingWorkspace, error: workspaceError } = useWorkspace(workspaceId);
  
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
  
  if (workspaceError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="container mx-auto p-4 md:p-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-lg p-6 my-8">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Error Loading Workspace</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              There was a problem loading this workspace. The workspace service may not be properly initialized.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Error: {String(workspaceError)}
            </p>
            <div className="flex gap-4">
              <a 
                href="/" 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Return to Home
              </a>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Retry
              </button>
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
