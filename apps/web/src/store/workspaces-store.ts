'use client';

import { create } from 'zustand';
import { 
  Workspace, 
  CreateWorkspaceInput, 
  fetchWorkspaces,
  fetchWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  adoptWorkspace
} from '@/lib/api-client';

interface WorkspacesState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchWorkspaces: () => Promise<void>;
  fetchWorkspace: (id: string) => Promise<void>;
  createWorkspace: (input: CreateWorkspaceInput) => Promise<Workspace>;
  updateWorkspace: (id: string, input: Partial<CreateWorkspaceInput>) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  adoptWorkspace: (input: CreateWorkspaceInput & { path: string }) => Promise<Workspace>;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  clearError: () => void;
}

export const useWorkspacesStore = create<WorkspacesState>((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  isLoading: false,
  error: null,
  
  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const workspaces = await fetchWorkspaces();
      set({ workspaces, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch workspaces',
        isLoading: false 
      });
    }
  },
  
  fetchWorkspace: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const workspace = await fetchWorkspace(id);
      set({ currentWorkspace: workspace, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch workspace',
        isLoading: false 
      });
    }
  },
  
  createWorkspace: async (input: CreateWorkspaceInput) => {
    set({ isLoading: true, error: null });
    try {
      const workspace = await createWorkspace(input);
      set((state) => ({
        workspaces: [...state.workspaces, workspace],
        isLoading: false
      }));
      return workspace;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create workspace',
        isLoading: false
      });
      throw error;
    }
  },
  
  updateWorkspace: async (id: string, input: Partial<CreateWorkspaceInput>) => {
    set({ isLoading: true, error: null });
    try {
      const workspace = await updateWorkspace(id, input);
      set((state) => ({
        workspaces: state.workspaces.map(w => w.id === id ? workspace : w),
        currentWorkspace: state.currentWorkspace?.id === id ? workspace : state.currentWorkspace,
        isLoading: false
      }));
      return workspace;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update workspace',
        isLoading: false
      });
      throw error;
    }
  },
  
  deleteWorkspace: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await deleteWorkspace(id);
      set((state) => ({
        workspaces: state.workspaces.filter(w => w.id !== id),
        currentWorkspace: state.currentWorkspace?.id === id ? null : state.currentWorkspace,
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete workspace',
        isLoading: false
      });
      throw error;
    }
  },
  
  adoptWorkspace: async (input: CreateWorkspaceInput & { path: string }) => {
    set({ isLoading: true, error: null });
    try {
      const workspace = await adoptWorkspace(input);
      set((state) => ({
        workspaces: [...state.workspaces, workspace],
        isLoading: false
      }));
      return workspace;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to adopt workspace',
        isLoading: false
      });
      throw error;
    }
  },
  
  setCurrentWorkspace: (workspace: Workspace | null) => {
    set({ currentWorkspace: workspace });
  },
  
  clearError: () => {
    set({ error: null });
  }
}));
