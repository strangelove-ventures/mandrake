/**
 * Session store for current session state
 */
import { create } from 'zustand';
import { useWorkspaceStore } from './workspaceStore';
import { api } from '@/lib/api';
import { CreateSessionParams } from './session/sessions';

// Store state interface
export interface SessionState {
  // State
  currentSessionId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentSessionId: (id: string | null) => void;
  createNewSession: (params: CreateSessionParams) => Promise<string | null>;
  clearError: () => void;
}

/**
 * Store for managing the current session
 */
export const useSessionStore = create<SessionState>((set, get) => ({
  // Initial state
  currentSessionId: null,
  isLoading: false,
  error: null,
  
  // Actions
  setCurrentSessionId: (id: string | null) => {
    set({ currentSessionId: id });
    
    // Save to localStorage if available
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem('currentSessionId', id);
      } else {
        localStorage.removeItem('currentSessionId');
      }
    }
  },
  
  createNewSession: async (params: CreateSessionParams) => {
    try {
      set({ isLoading: true, error: null });
      
      // Get current workspace ID
      const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
      if (!workspaceId) {
        throw new Error('No workspace selected');
      }
      
      // Create a new session with title and description
      const session = await api.sessions.create(params, workspaceId);
      
      // Set as current session
      set({ currentSessionId: session.id, isLoading: false });
      
      return session.id;
    } catch (err) {
      // Handle error
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to create session' 
      });
      return null;
    }
  },
  
  clearError: () => set({ error: null })
}));

/**
 * Initialize the session store
 * Loads the current session ID from localStorage
 */
export function initSessionStore() {
  // Only run in browser
  if (typeof window === 'undefined') return;
  
  const storedId = localStorage.getItem('currentSessionId');
  if (storedId) {
    useSessionStore.getState().setCurrentSessionId(storedId);
  }
}