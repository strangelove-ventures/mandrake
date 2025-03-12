/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * React Query hooks for dynamic context API
 */
import { 
  useQuery, 
  useMutation, 
  useQueryClient
} from '@tanstack/react-query';
import { api } from '@/lib/api';

// Query keys for dynamic context
export const dynamicContextKeys = {
  all: ['dynamic-context'] as const,
  list: (workspaceId?: string) => [...dynamicContextKeys.all, 'list', workspaceId] as const,
  detail: (id: string, workspaceId?: string) => [...dynamicContextKeys.all, 'detail', workspaceId, id] as const,
};

/**
 * Hook to fetch all dynamic context methods
 */
export function useDynamicContextList(workspaceId?: string) {
  return useQuery({
    queryKey: dynamicContextKeys.list(workspaceId),
    queryFn: () => api.dynamic.get(workspaceId as string)
  });
}

/**
 * Hook for creating a new dynamic context method
 */
export function useCreateDynamicContext(workspaceId?: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (contextConfig: any) => api.dynamic.create(contextConfig, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dynamicContextKeys.list(workspaceId) });
    }
  });
}

/**
 * Hook for updating a dynamic context method
 */
export function useUpdateDynamicContext(workspaceId?: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      api.dynamic.update({ id, ...updates }, workspaceId),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: dynamicContextKeys.detail(id, workspaceId) });
      queryClient.invalidateQueries({ queryKey: dynamicContextKeys.list(workspaceId) });
    }
  });
}

/**
 * Hook for updating only the enabled status of a dynamic context method
 */
export function useToggleDynamicContextEnabled(workspaceId?: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => 
      api.dynamic.update(id, { refresh: { enabled } }, workspaceId),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: dynamicContextKeys.detail(id, workspaceId) });
      queryClient.invalidateQueries({ queryKey: dynamicContextKeys.list(workspaceId) });
    }
  });
}

/**
 * Hook for deleting a dynamic context method
 */
export function useDeleteDynamicContext(workspaceId?: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.dynamic.delete(id, workspaceId),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: dynamicContextKeys.list(workspaceId) });
      queryClient.removeQueries({ queryKey: dynamicContextKeys.detail(id, workspaceId) });
    }
  });
}