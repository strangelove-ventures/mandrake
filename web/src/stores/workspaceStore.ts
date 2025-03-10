/**
 * Workspace store for current workspace state
 */
import { create } from 'zustand';
import { api } from '@/lib/api';
import { 
  WorkspaceResponse 
} from '@mandrake/utils/dist/types/api';

// Store state interface
interface WorkspaceState {
  // State
  currentWorkspaceId: string | null;
  workspaces: WorkspaceResponse[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentWorkspaceId: (id: string | null) => void;
  loadWorkspaces: () => Promise<void>;
  clearError: () => void;
}

/**
 * Store for managing the current workspace
 */
export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  // Initial state
  currentWorkspaceId: null,
  workspaces: [],
  isLoading: false,
  error: null,
  
  // Actions
  setCurrentWorkspaceId: (id: string | null) => {
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
      console.log('Loading workspaces...');
      set({ isLoading: true, error: null });
      
      // Load workspaces from API
      const workspaces = await api.workspaces.list();
      console.log('Workspaces loaded:', workspaces);
      set({ workspaces, isLoading: false });
      
      // If we have a stored workspace ID, verify it exists
      const { currentWorkspaceId } = get();
      console.log('Current workspace ID:', currentWorkspaceId);
      if (currentWorkspaceId) {
        const exists = workspaces.some(w => w.id === currentWorkspaceId);
        if (!exists && workspaces.length > 0) {
          // If not found but we have workspaces, set the first one
          console.log('Setting to first workspace:', workspaces[0].id);
          get().setCurrentWorkspaceId(workspaces[0].id);
        } else if (!exists) {
          // If not found and no workspaces, clear the ID
          console.log('Clearing workspace ID');
          get().setCurrentWorkspaceId(null);
        }
      } else if (workspaces.length > 0) {
        // No current workspace but we have workspaces, set the first one
        console.log('No current workspace, setting to first:', workspaces[0].id);
        get().setCurrentWorkspaceId(workspaces[0].id);
      }
    } catch (err) {
      // Handle error
      console.error('Error loading workspaces:', err);
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to load workspaces' 
      });
    }
  },
  
  clearError: () => set({ error: null })
}));

/**
 * Initialize the workspace store
 * Loads the current workspace ID from localStorage
 */
export function initWorkspaceStore() {
  // Only run in browser
  if (typeof window === 'undefined') return;
  
  const storedId = localStorage.getItem('currentWorkspaceId');
  if (storedId) {
    useWorkspaceStore.getState().setCurrentWorkspaceId(storedId);
  }
}