import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkspacesHandler } from '@/lib/api/handlers/WorkspacesHandler';
import { NextRequest } from 'next/server';
import { ApiError } from '@/lib/api/middleware/errorHandling';
import { join } from 'path';
import { mkdir, rm } from 'fs/promises';
import { createTestDirectory } from '@mandrake/workspace/tests/utils/utils';

describe('WorkspacesHandler', () => {
  let testDir: any;
  let mandrakeRoot: string;
  let workspacesHandler: WorkspacesHandler;
  
  beforeEach(async () => {
    // Create a temporary directory for testing
    testDir = await createTestDirectory();
    mandrakeRoot = join(testDir.path, 'mandrake');
    
    // Create Mandrake root directory
    await mkdir(mandrakeRoot, { recursive: true });
    
    // Create handler
    workspacesHandler = new WorkspacesHandler(mandrakeRoot);
  });
  
  afterEach(async () => {
    // Clean up the test directory
    if (testDir) {
      await testDir.cleanup();
    }
  });

  describe('createWorkspace / getWorkspace', () => {
    it('should create and get a workspace', async () => {
      // Create a mock request with workspace data
      const mockRequest = {
        json: () => Promise.resolve({
          name: 'test-workspace',
          description: 'A test workspace'
        })
      } as NextRequest;
      
      // Create a workspace
      const workspace = await workspacesHandler.createWorkspace(mockRequest);
      
      // Verify workspace was created with correct data
      expect(workspace).toBeDefined();
      expect(workspace.id).toBeDefined();
      expect(workspace.name).toBe('test-workspace');
      expect(workspace.description).toBe('A test workspace');
      
      // Get the workspace by name
      const retrievedWorkspace = await workspacesHandler.getWorkspace('test-workspace');
      
      // Verify retrieved workspace matches created workspace
      expect(retrievedWorkspace).toBeDefined();
      expect(retrievedWorkspace.id).toBe(workspace.id);
      expect(retrievedWorkspace.name).toBe('test-workspace');
      expect(retrievedWorkspace.description).toBe('A test workspace');
    });
    
    it('should throw when creating a workspace with invalid name', async () => {
      // Create a mock request with invalid workspace name
      const mockRequest = {
        json: () => Promise.resolve({
          name: 'invalid workspace name',
          description: 'Contains spaces which are not allowed'
        })
      } as NextRequest;
      
      // Attempt to create workspace should throw
      await expect(workspacesHandler.createWorkspace(mockRequest)).rejects.toThrow();
    });
    
    it('should throw when getting a non-existent workspace', async () => {
      await expect(workspacesHandler.getWorkspace('non-existent')).rejects.toThrow();
    });
  });

  describe('updateWorkspace', () => {
    it('should update a workspace', async () => {
      // First create a workspace
      const createRequest = {
        json: () => Promise.resolve({
          name: 'workspace-to-update',
          description: 'Original description'
        })
      } as NextRequest;
      
      await workspacesHandler.createWorkspace(createRequest);
      
      // Update the workspace
      const updateRequest = {
        json: () => Promise.resolve({
          description: 'Updated description'
        })
      } as NextRequest;
      
      const updatedWorkspace = await workspacesHandler.updateWorkspace('workspace-to-update', updateRequest);
      
      // Verify the update
      expect(updatedWorkspace).toBeDefined();
      expect(updatedWorkspace.name).toBe('workspace-to-update');
      expect(updatedWorkspace.description).toBe('Updated description');
      
      // Get the workspace to verify persistence
      const retrievedWorkspace = await workspacesHandler.getWorkspace('workspace-to-update');
      expect(retrievedWorkspace.description).toBe('Updated description');
    });
    
    it('should throw when updating a non-existent workspace', async () => {
      const updateRequest = {
        json: () => Promise.resolve({
          description: 'Updated description'
        })
      } as NextRequest;
      
      await expect(workspacesHandler.updateWorkspace('non-existent', updateRequest)).rejects.toThrow();
    });
  });

  describe('deleteWorkspace', () => {
    it('should throw not implemented error', async () => {
      // Create a workspace first
      const createRequest = {
        json: () => Promise.resolve({
          name: 'workspace-to-delete',
          description: 'Will be deleted'
        })
      } as NextRequest;
      
      await workspacesHandler.createWorkspace(createRequest);
      
      // Attempt to delete should throw "not implemented"
      await expect(workspacesHandler.deleteWorkspace('workspace-to-delete')).rejects.toThrow(/not implemented/i);
    });
  });

  describe('listWorkspaces', () => {
    it('should return an empty array (placeholder implementation)', async () => {
      const workspaces = await workspacesHandler.listWorkspaces();
      expect(Array.isArray(workspaces)).toBe(true);
    });
  });
});
