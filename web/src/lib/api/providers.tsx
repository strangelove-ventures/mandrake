'use client';
/**
 * React Query providers for API integration
 */
import { ReactNode } from 'react';
import { 
  QueryClient, 
  QueryClientProvider
} from '@tanstack/react-query';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default configuration for queries
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
      refetchOnWindowFocus: false
    },
  },
});

interface ApiProviderProps {
  children: ReactNode;
}

/**
 * API provider component that wraps React Query
 */
export function ApiProvider({ children }: ApiProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

/**
 * Gets the query client instance
 */
export function getQueryClient() {
  return queryClient;
}