/**
 * Workspace store for current workspace state
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

export interface WorkspaceState {
  // State
  currentWorkspaceId: string | null;
  workspaces: any[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentWorkspaceId: (id: string | null) => void;
  loadWorkspaces: () => Promise<void>;
  clearError: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentWorkspaceId: null,
      workspaces: [],
      isLoading: false,
      error: null,
      
      // Actions
      setCurrentWorkspaceId: (id) => {
        set({ currentWorkspaceId: id });
        
        // Save to localStorage if available
        if (typeof window !== 'undefined') {
          if (id) {
            localStorage.setItem('currentWorkspaceId', id);
          } else {
            localStorage.removeItem('currentWorkspaceId');
          }
        }
      },
      
      loadWorkspaces: async () => {
        try {
          set({ isLoading: true, error: null });
          console.log('Loading workspaces...');
          
          // Load workspaces from API
          const workspaces = await api.workspaces.list();
          console.log('Workspaces loaded:', workspaces);
          
          set({ 
            workspaces,
            isLoading: false 
          });
          
          // If we have a stored workspace ID, verify it exists
          const { currentWorkspaceId } = get();
          if (currentWorkspaceId) {
            const exists = workspaces.some(w => w.id === currentWorkspaceId);
            if (!exists && workspaces.length > 0) {
              // If not found but we have workspaces, set the first one
              get().setCurrentWorkspaceId(workspaces[0].id);
            } else if (!exists) {
              // If not found and no workspaces, clear the ID
              get().setCurrentWorkspaceId(null);
            }
          } else if (workspaces.length > 0) {
            // No current workspace but we have workspaces, set the first one
            get().setCurrentWorkspaceId(workspaces[0].id);
          }
        } catch (err) {
          console.error('Failed to load workspaces:', err);
          set({ 
            isLoading: false, 
            error: err instanceof Error ? err.message : 'Failed to load workspaces' 
          });
        }
      },
      
      clearError: () => set({ error: null })
    }),
    {
      name: 'mandrake-workspace',
    }
  )
);
