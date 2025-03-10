'use client';

import { useState, useEffect } from 'react';
import { useCreateWorkspace } from '@/hooks/api';
import { useWorkspaceStore } from '@/stores';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
  // Form state
  const [name, setName] = useState('');
  const [useCustomPath, setUseCustomPath] = useState(false);
  const [customPath, setCustomPath] = useState('');
  
  // Derived state for the path
  const defaultPath = name ? `~/.mandrake/workspaces/${name.toLowerCase().replace(/\s+/g, '-')}` : '';
  const path = useCustomPath ? customPath : defaultPath;
  
  // Reset form when modal is opened
  useEffect(() => {
    if (isOpen) {
      setName('');
      setUseCustomPath(false);
      setCustomPath('');
    }
  }, [isOpen]);
  
  // Mutation for creating a workspace
  const createWorkspace = useCreateWorkspace();
  
  // Get setter for current workspace
  const { setCurrentWorkspaceId } = useWorkspaceStore();
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !path) return;
    
    createWorkspace.mutate({
      name,
      path
    }, {
      onSuccess: (workspace: { id: string }) => {
        setCurrentWorkspaceId(workspace.id);
        onClose();
      }
    });
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6 m-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Create Workspace</h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Name*</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              placeholder="My Project"
              required
              autoFocus
            />
          </div>
          
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="custom-path"
                checked={useCustomPath}
                onChange={(e) => setUseCustomPath(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="custom-path" className="text-sm font-medium">
                Use custom path
              </label>
            </div>
            
            {useCustomPath ? (
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                placeholder="/path/to/project"
                required={useCustomPath}
              />
            ) : (
              <div className="text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded border dark:border-gray-600">
                {defaultPath || '~/.mandrake/workspaces/your-project'}
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createWorkspace.isPending || !name}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {createWorkspace.isPending ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
          
          {createWorkspace.isError && (
            <div className="mt-3 text-red-500 text-sm">
              {String(createWorkspace.error)}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
