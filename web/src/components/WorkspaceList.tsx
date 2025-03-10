/**
 * Example component that demonstrates using the API client with React Query
 */
'use client';

import { useWorkspaces, useCreateWorkspace } from '@/hooks/api';
import { useWorkspaceStore } from '@/stores';
import { useState } from 'react';

export default function WorkspaceList() {
  // State for new workspace form
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspacePath, setNewWorkspacePath] = useState('');
  
  // Get workspaces using React Query
  const { data: workspaces, isLoading, error } = useWorkspaces();
  
  // Mutation for creating a workspace
  const createWorkspace = useCreateWorkspace();
  
  // Current workspace from store
  const { 
    currentWorkspaceId, 
    setCurrentWorkspaceId 
  } = useWorkspaceStore();
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName || !newWorkspacePath) return;
    
    createWorkspace.mutate({
      name: newWorkspaceName,
      path: newWorkspacePath
    }, {
      onSuccess: (workspace) => {
        setNewWorkspaceName('');
        setNewWorkspacePath('');
        setCurrentWorkspaceId(workspace.id);
      }
    });
  };
  
  if (isLoading) return <div>Loading workspaces...</div>;
  if (error) return <div>Error loading workspaces: {String(error)}</div>;
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Workspaces</h2>
      
      {/* Workspace list */}
      <ul className="mb-6 divide-y">
        {workspaces?.map(workspace => (
          <li 
            key={workspace.id}
            className={`py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer ${
              workspace.id === currentWorkspaceId ? 'bg-blue-50 dark:bg-blue-900' : ''
            }`}
            onClick={() => setCurrentWorkspaceId(workspace.id)}
          >
            <div className="font-medium">{workspace.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {workspace.path}
            </div>
          </li>
        ))}
        
        {workspaces?.length === 0 && (
          <li className="py-4 text-center text-gray-500">
            No workspaces found. Create one below.
          </li>
        )}
      </ul>
      
      {/* Create workspace form */}
      <form onSubmit={handleSubmit} className="mt-4 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Create Workspace</h3>
        
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="My Project"
            required
          />
        </div>
        
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Path</label>
          <input
            type="text"
            value={newWorkspacePath}
            onChange={(e) => setNewWorkspacePath(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="/path/to/project"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={createWorkspace.isPending}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {createWorkspace.isPending ? 'Creating...' : 'Create Workspace'}
        </button>
        
        {createWorkspace.isError && (
          <div className="mt-2 text-red-500 text-sm">
            {String(createWorkspace.error)}
          </div>
        )}
      </form>
    </div>
  );
}