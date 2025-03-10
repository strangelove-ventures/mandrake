/**
 * Workspace list component for the landing page
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWorkspaces } from '@/hooks/api';
import { useWorkspaceStore, useModalStore } from '@/stores';
import CreateWorkspaceModal from '@/components/modals/CreateWorkspaceModal';

export default function WorkspaceList() {
  // Get workspaces using React Query
  const { data: workspaces, isLoading, error, refetch } = useWorkspaces();
  
  // Get current workspace from store
  const { 
    currentWorkspaceId,
    setCurrentWorkspaceId 
  } = useWorkspaceStore();
  
  // Modal store
  const { 
    isModalOpen, 
    openModal, 
    closeModal 
  } = useModalStore();
  
  // Fetch workspaces on mount
  useEffect(() => {
    refetch();
  }, [refetch]);
  
  if (isLoading) return <div className="p-4">Loading workspaces...</div>;
  if (error) return <div className="p-4 text-red-500">Error loading workspaces: {String(error)}</div>;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Workspaces</h2>
        
        <button 
          onClick={() => openModal('createWorkspace')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          New Workspace
        </button>
      </div>
      
      {/* Workspace list */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="pb-3 px-4">Name</th>
              <th className="pb-3 px-4">Path</th>
              <th className="pb-3 px-4">Sessions</th>
              <th className="pb-3 px-4">Tools</th>
              <th className="pb-3 px-4">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {workspaces?.map(workspace => (
              <tr 
                key={workspace.id}
                className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                  workspace.id === currentWorkspaceId ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                }`}
                onClick={() => setCurrentWorkspaceId(workspace.id)}
              >
                <td className="py-3 px-4">
                  <Link href={`/workspace/${workspace.id}`}>
                    <span className="font-medium text-blue-600 dark:text-blue-400">{workspace.name}</span>
                  </Link>
                </td>
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                  {workspace.path}
                </td>
                <td className="py-3 px-4">
                  {workspace.sessionCount || 0}
                </td>
                <td className="py-3 px-4">
                  {workspace.toolCount || 0}
                </td>
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                  {new Date(workspace.updatedAt || workspace.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            
            {(!workspaces || workspaces.length === 0) && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-gray-500">
                  No workspaces found. Create one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Create Workspace Modal */}
      <CreateWorkspaceModal 
        isOpen={isModalOpen('createWorkspace')} 
        onClose={() => {
          closeModal('createWorkspace');
          refetch();
        }}
      />
    </div>
  );
}