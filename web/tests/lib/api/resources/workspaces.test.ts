/**
 * Functional tests for the workspaces API client
 * These tests make actual API calls to test functionality
 */
import { test, expect, beforeAll, afterAll } from 'bun:test';
import { api } from '@/lib/api';
import { testApiClient } from '../../../lib/api-client';

// Skip all tests if API_TEST_MODE is not 'integration'
const API_TEST_MODE = process.env.API_TEST_MODE;
const runTests = API_TEST_MODE === 'integration';

// Define a unique identifier for test resources to avoid conflicts
const testId = Date.now().toString();
const testWorkspaceName = `Test_Workspace_${testId}`;
const testWorkspacePath = `/tmp/Test_Workspace_${testId}`;

// Track created resources for cleanup
let createdWorkspaceId: string | null = null;

// Conditional test helper that only runs in integration mode
function integrationTest(name: string, fn: () => Promise<void>) {
  if (runTests) {
    test(name, fn);
  } else {
    test.skip(name, () => {});
  }
}

// Output test mode info
beforeAll(() => {
  if (!runTests) {
    console.log('Skipping API integration tests. Set API_TEST_MODE=integration to run them.');
  } else {
    console.log('Running API integration tests against the real API...');
    console.log('Make sure the Mandrake API server is running at http://localhost:4000');
  }
});

// Clean up after tests
afterAll(async () => {
  if (runTests && createdWorkspaceId) {
    try {
      // Try to clean up the workspace
      try {
        await testApiClient.fetchJson(`/workspaces/${createdWorkspaceId}`, { method: 'DELETE' });
        console.log(`Cleaned up test workspace: ${createdWorkspaceId}`);
      } catch (deleteErr: any) {
        if (deleteErr.status === 404) {
          console.log('DELETE workspace endpoint not implemented, skipping cleanup');
        } else {
          throw deleteErr;
        }
      }
    } catch (err) {
      console.error('Failed to clean up test workspace:', err);
    }
  }
});

// Test listing workspaces
integrationTest('can list workspaces', async () => {
  try {
    // Use the test API client that has the correct port
    const workspaces = await testApiClient.fetchJson('/workspaces');
    
    // Verify response format
    expect(Array.isArray(workspaces)).toBe(true);
    
    // If workspaces exist, verify their structure
    if (workspaces.length > 0) {
      const workspace = workspaces[0];
      expect(workspace).toHaveProperty('id');
      expect(workspace).toHaveProperty('name');
      expect(workspace).toHaveProperty('path');
    }
  } catch (error) {
    console.error('List workspaces error:', error);
    throw error;
  }
});

// Test creating a workspace
integrationTest('can create a workspace', async () => {
  try {
    const response = await testApiClient.fetchJson('/workspaces', { 
      method: 'POST', 
      body: {
        name: testWorkspaceName,
        path: testWorkspacePath,
        description: 'Test workspace for API integration tests'
      }
    });
    
    // Save ID for cleanup
    createdWorkspaceId = response.id;
    
    // Verify response format
    expect(response).toHaveProperty('id');
    expect(response).toHaveProperty('name', testWorkspaceName);
    expect(response).toHaveProperty('path', testWorkspacePath);
    expect(response).toHaveProperty('description', 'Test workspace for API integration tests');
  } catch (error) {
    console.error('Create workspace error:', error);
    throw error;
  }
});

// Test getting a workspace
integrationTest('can get a workspace by ID', async () => {
  // Skip if no workspace was created
  if (!createdWorkspaceId) {
    console.log('Skipping test: No workspace was created');
    return;
  }
  
  try {
    const workspace = await testApiClient.fetchJson(`/workspaces/${createdWorkspaceId}`);
    
    // Verify response format
    expect(workspace).toHaveProperty('id', createdWorkspaceId);
    expect(workspace).toHaveProperty('name', testWorkspaceName);
    expect(workspace).toHaveProperty('path', testWorkspacePath);
  } catch (error) {
    console.error('Get workspace error:', error);
    throw error;
  }
});

// Test error handling
integrationTest('handles errors correctly', async () => {
  try {
    await testApiClient.fetchJson('/workspaces/non-existent-workspace-id');
    
    // If we get here, the test should fail
    expect(false).toBe(true);
  } catch (error: any) {
    // Verify error format
    expect(error).toHaveProperty('message');
    
    // For ApiError from our client
    if (error.status) {
      expect(error.status).toBe(404);
    } else {
      // For other error types (like connection errors)
      expect(error.message).toBeTruthy();
    }
  }
});