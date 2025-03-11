/**
 * System sessions store
 */
import { create } from 'zustand';
import { api } from '@/lib/api';

// Session interfaces
export interface Session {
  id: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
  messageCount?: number;
}

export interface CreateSessionParams {
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface SessionState {
  // State
  systemSessions: Session[];
  currentSessionId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadSystemSessions: () => Promise<void>;
  setCurrentSession: (id: string | null) => void;
  createNewSession: (params: CreateSessionParams) => Promise<string | null>;
  clearError: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  // Initial state
  systemSessions: [],
  currentSessionId: null,
  isLoading: false,
  error: null,
  
  // Actions
  loadSystemSessions: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Load system sessions from API
      const sessions = await api.sessions.list();
      set({ 
        systemSessions: sessions,
        isLoading: false 
      });
    } catch (err) {
      console.error('Failed to load system sessions:', err);
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to load system sessions' 
      });
    }
  },
  
  setCurrentSession: (id) => {
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
      
      // Create a new session
      const session = await api.sessions.create(params);
      
      // Add to local state
      set((state) => ({ 
        systemSessions: [...state.systemSessions, session],
        currentSessionId: session.id, 
        isLoading: false 
      }));
      
      return session.id;
    } catch (err) {
      console.error('Failed to create session:', err);
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to create session' 
      });
      return null;
    }
  },
  
  clearError: () => set({ error: null })
}));
