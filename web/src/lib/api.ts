// API client for interacting with the Mandrake API

// In development on server-side, use direct URL
// Otherwise use the API proxy route
const API_BASE_URL = typeof window === 'undefined'
  ? 'http://localhost:4000'
  : '/api';

// Check if API is down - in which case use a mock data mode
const isOfflineMode = process.env.OFFLINE_MODE === 'true';

/**
 * Base fetch wrapper with error handling
 */
async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    // Try to get error details from response
    let errorDetails = '';
    try {
      const errorData = await response.json();
      errorDetails = errorData.message || JSON.stringify(errorData);
    } catch (e) {
      // If we can't parse JSON, use status text
      errorDetails = response.statusText;
    }

    throw new Error(`API error (${response.status}): ${errorDetails}`);
  }

  return response.json() as Promise<T>;
}

// API endpoints for system management
export const api = {
  // System status
  getStatus: () => fetchAPI<{ status: string }>('/'),

  // Config management
  getConfig: () => fetchAPI<any>('/system/config'),
  updateConfig: (config: any) => fetchAPI<any>('/system/config', {
    method: 'PUT',
    body: JSON.stringify(config),
  }),

  // Workspace management
  listWorkspaces: () => fetchAPI<any[]>('/workspaces'),
  getWorkspace: (id: string) => fetchAPI<any>(`/workspaces/${id}`),
  registerWorkspace: (workspace: any) => fetchAPI<any>('/workspaces', {
    method: 'POST',
    body: JSON.stringify(workspace),
  }),
  unregisterWorkspace: (id: string) => fetchAPI<void>(`/workspaces/${id}`, {
    method: 'DELETE',
  }),

  // Tools management
  listToolsConfigs: () => fetchAPI<any[]>('/tools'),
  getToolsConfig: (id: string) => fetchAPI<any>(`/tools/${id}`),
  getActiveToolsConfig: () => fetchAPI<any>('/tools/active'),
  setActiveToolsConfig: (id: string) => fetchAPI<any>('/tools/active', {
    method: 'PUT',
    body: JSON.stringify({ id }),
  }),
  
  // Models management
  listModels: () => fetchAPI<any[]>('/system/models'),
  getModel: (id: string) => fetchAPI<any>(`/system/models/${id}`),
  getActiveModel: () => fetchAPI<any>('/system/models/active'),
  setActiveModel: (id: string) => fetchAPI<any>('/system/models/active', {
    method: 'PUT',
    body: JSON.stringify({ id }),
  }),
  
  // Providers management
  listProviders: () => fetchAPI<any[]>('/providers'),
  getProvider: (id: string) => fetchAPI<any>(`/providers/${id}`),

  // Sessions management
  listSessions: (opts: { workspaceId?: string } = {}) => 
    fetchAPI<any[]>(`/sessions${opts.workspaceId ? `?workspaceId=${opts.workspaceId}` : ''}`),
  getSession: (id: string) => fetchAPI<any>(`/sessions/${id}`),
  createSession: (data: any) => fetchAPI<any>('/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateSession: (id: string, data: any) => fetchAPI<any>(`/sessions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteSession: (id: string) => fetchAPI<void>(`/sessions/${id}`, {
    method: 'DELETE',
  }),
  
  // Session streaming (returns EventSource, not fetch)
  streamRequest: (sessionId: string, message: string) => {
    // Use absolute URL with http:// protocol for EventSource which doesn't work with relative URLs
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin + '/api' 
      : 'http://localhost:4000';
    
    const url = new URL(`${baseUrl}/streaming/${sessionId}/request`);
    url.searchParams.append('message', message);
    
    return new EventSource(url.toString());
  }
};