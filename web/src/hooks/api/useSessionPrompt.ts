import { useQuery } from '@tanstack/react-query';
import { sessions } from '@/lib/api/resources/sessions';

/**
 * Hook to fetch a session's system prompt
 */
export function useSessionPrompt(sessionId: string, workspaceId?: string) {
  const queryKey = workspaceId
    ? ['workspaces', workspaceId, 'sessions', sessionId, 'prompt']
    : ['system', 'sessions', sessionId, 'prompt'];
  
  return useQuery({
    queryKey,
    queryFn: () => sessions.getSessionPrompt(sessionId, workspaceId),
    enabled: !!sessionId, // Only run if sessionId is provided
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });
}
