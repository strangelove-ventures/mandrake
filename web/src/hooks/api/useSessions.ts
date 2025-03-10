/**
 * React Query hooks for sessions API
 */
import { 
  useQuery, 
  useMutation, 
  useQueryClient 
} from '@tanstack/react-query';
import { api } from '@/lib/api';

// Query keys for sessions
export const sessionKeys = {
  all: ['sessions'] as const,
  lists: (workspaceId?: string) => 
    [...sessionKeys.all, 'list', ...(workspaceId ? [workspaceId] : [])] as const,
  detail: (id: string, workspaceId?: string) => 
    [...sessionKeys.all, 'detail', id, ...(workspaceId ? [workspaceId] : [])] as const,
  messages: (id: string, workspaceId?: string) => 
    [...sessionKeys.all, 'messages', id, ...(workspaceId ? [workspaceId] : [])] as const,
};

/**
 * Hook to fetch sessions, optionally filtered by workspace
 */
export function useSessions(workspaceId?: string) {
  return useQuery({
    queryKey: sessionKeys.lists(workspaceId),
    queryFn: () => api.sessions.list(workspaceId)
  });
}

/**
 * Hook to fetch a single session
 */
export function useSession(id: string, workspaceId?: string) {
  return useQuery({
    queryKey: sessionKeys.detail(id, workspaceId),
    queryFn: () => api.sessions.get(id, workspaceId),
    enabled: Boolean(id)
  });
}

/**
 * Hook to fetch session messages
 */
export function useSessionMessages(sessionId: string, workspaceId?: string) {
  return useQuery({
    queryKey: sessionKeys.messages(sessionId, workspaceId),
    queryFn: () => api.sessions.getMessages(sessionId, workspaceId),
    enabled: Boolean(sessionId)
  });
}

/**
 * Hook for creating a session
 */
export function useCreateSession(workspaceId?: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: any) => api.sessions.create(params, workspaceId),
    onSuccess: (data) => {
      // Update lists
      queryClient.invalidateQueries({ 
        queryKey: sessionKeys.lists(workspaceId) 
      });
      
      // Add to cache
      queryClient.setQueryData(
        sessionKeys.detail(data.id, workspaceId), 
        data
      );
    }
  });
}

/**
 * Hook for updating a session
 */
export function useUpdateSession(workspaceId?: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, params }: { id: string; params: any }) => 
      api.sessions.update(id, params, workspaceId),
    onSuccess: (data) => {
      // Update specific session cache
      queryClient.setQueryData(
        sessionKeys.detail(data.id, workspaceId), 
        data
      );
      
      // Invalidate list
      queryClient.invalidateQueries({ 
        queryKey: sessionKeys.lists(workspaceId) 
      });
    }
  });
}

/**
 * Hook for deleting a session
 */
export function useDeleteSession(workspaceId?: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.sessions.delete(id, workspaceId),
    onSuccess: (_data, id) => {
      // Remove from cache
      queryClient.removeQueries({ 
        queryKey: sessionKeys.detail(id, workspaceId) 
      });
      queryClient.removeQueries({ 
        queryKey: sessionKeys.messages(id, workspaceId) 
      });
      
      // Invalidate list
      queryClient.invalidateQueries({ 
        queryKey: sessionKeys.lists(workspaceId) 
      });
    }
  });
}

/**
 * Hook for sending a message to a session
 */
export function useSendMessage(workspaceId?: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ sessionId, message }: { sessionId: string; message: string }) => 
      api.sessions.sendMessage(sessionId, message, workspaceId),
    onSuccess: (_data, { sessionId }) => {
      // Invalidate messages for this session
      queryClient.invalidateQueries({ 
        queryKey: sessionKeys.messages(sessionId, workspaceId) 
      });
      
      // Invalidate session details as they might have changed
      queryClient.invalidateQueries({ 
        queryKey: sessionKeys.detail(sessionId, workspaceId) 
      });
    }
  });
}