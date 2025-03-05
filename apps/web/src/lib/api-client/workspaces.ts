'use client';

/**
 * Interface for a workspace
 */
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  path?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Interface for creating a workspace
 */
export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  path?: string;
}

/**
 * Fetch all workspaces
 */
export async function fetchWorkspaces(): Promise<Workspace[]> {
  const response = await fetch('/api/workspaces');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch workspaces: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}

/**
 * Create a new workspace
 */
export async function createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
  const response = await fetch('/api/workspaces', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create workspace: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}

/**
 * Fetch a single workspace by ID
 */
export async function fetchWorkspace(id: string): Promise<Workspace> {
  const response = await fetch(`/api/workspaces/${id}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch workspace: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}

/**
 * Update a workspace
 */
export async function updateWorkspace(id: string, input: Partial<CreateWorkspaceInput>): Promise<Workspace> {
  const response = await fetch(`/api/workspaces/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update workspace: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}

/**
 * Delete a workspace
 */
export async function deleteWorkspace(id: string): Promise<void> {
  const response = await fetch(`/api/workspaces/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete workspace: ${response.statusText}`);
  }
}

/**
 * Adopt an existing workspace
 */
export async function adoptWorkspace(input: CreateWorkspaceInput & { path: string }): Promise<Workspace> {
  const response = await fetch('/api/workspaces/adopt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to adopt workspace: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}
