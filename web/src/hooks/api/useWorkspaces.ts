/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * React Query hooks for workspaces API
 */
import { 
  useQuery, 
  useMutation, 
  useQueryClient
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  CreateWorkspaceRequest, 
  UpdateWorkspaceRequest,
} from '@mandrake/utils/dist/types/api';

// Query keys for workspaces
export const workspaceKeys = {
  all: ['workspaces'] as const,
  lists: () => [...workspaceKeys.all, 'list'] as const,
  detail: (id: string) => [...workspaceKeys.all, 'detail', id] as const,
  config: (id: string) => [...workspaceKeys.all, 'config', id] as const,
  stats: (id: string) => [...workspaceKeys.all, 'stats', id] as const,
};

/**
 * Hook to fetch all workspaces
 */
export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.lists(),
    queryFn: () => api.workspaces.list()
  });
}

/**
 * Hook to fetch a single workspace by ID
 */
export function useWorkspace(id: string) {
  return useQuery({
    queryKey: workspaceKeys.detail(id),
    queryFn: () => api.workspaces.get(id),
    enabled: Boolean(id)
  });
}

/**
 * Hook to fetch workspace configuration
 */
export function useWorkspaceConfig(id: string) {
  return useQuery({
    queryKey: workspaceKeys.config(id),
    queryFn: () => api.workspaces.config.get(id),
    enabled: Boolean(id)
  });
}

/**
 * Hook to fetch workspace statistics
 */
export function useWorkspaceStats(id: string) {
  return useQuery({
    queryKey: workspaceKeys.stats(id),
    queryFn: () => api.workspaces.stats(id),
    enabled: Boolean(id)
  });
}

/**
 * Hook for creating a workspace
 */
export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: CreateWorkspaceRequest) => 
      api.workspaces.create(params),
    onSuccess: (data) => {
      // Update list cache
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
      // Add to detail cache
      queryClient.setQueryData(workspaceKeys.detail(data.id), data);
    }
  });
}

/**
 * Hook for updating a workspace
 */
export function useUpdateWorkspace() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, params }: { id: string; params: UpdateWorkspaceRequest }) => 
      api.workspaces.update(id, params),
    onSuccess: (data) => {
      // Update specific workspace cache
      queryClient.setQueryData(workspaceKeys.detail(data.id), data);
      // Invalidate list to reflect changes
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    }
  });
}

/**
 * Hook for deleting a workspace
 */
export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.workspaces.delete(id),
    onSuccess: (_data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: workspaceKeys.detail(id) });
      queryClient.removeQueries({ queryKey: workspaceKeys.config(id) });
      queryClient.removeQueries({ queryKey: workspaceKeys.stats(id) });
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    }
  });
}

/**
 * Hook for updating workspace config
 */
export function useUpdateWorkspaceConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, config }: { id: string; config: any }) => 
      api.workspaces.config.update(id, config),
    onSuccess: (_data, { id }) => {
      // Invalidate config
      queryClient.invalidateQueries({ queryKey: workspaceKeys.config(id) });
    }
  });
}