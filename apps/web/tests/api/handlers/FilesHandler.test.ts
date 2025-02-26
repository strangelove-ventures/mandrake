import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FilesHandler } from '@/lib/api/handlers/FilesHandler';
import { NextRequest } from 'next/server';
import { WorkspaceManager } from '@mandrake/workspace';
import { createTestDirectory } from '@mandrake/workspace/tests/utils/utils';

describe('FilesHandler', () => {
  let testDir: any;
  let workspaceManager: WorkspaceManager;
  let filesHandler: FilesHandler;
  
  beforeEach(async () => {
    // Create a temporary workspace for testing
    testDir = await createTestDirectory();
    workspaceManager = new WorkspaceManager(testDir.path, 'test-workspace');
    await workspaceManager.init('Test workspace for API testing');
    
    // Create handler
    filesHandler = new FilesHandler('test-workspace', workspaceManager);
  });
  
  afterEach(async () => {
    // Clean up the test workspace
    if (testDir) {
      await testDir.cleanup();
    }
  });

  describe('listFiles / createFile / getFile', () => {
    it('should create, list, and get files', async () => {
      // Create a mock request with file data
      const mockRequest = {
        json: () => Promise.resolve({
          content: 'Test file content',
          active: true
        })
      } as NextRequest;
      
      // Create a file
      const fileName = 'test-file.txt';
      const file = await filesHandler.createFile(fileName, mockRequest);
      
      // Verify file was created with correct data
      expect(file).toBeDefined();
      expect(file.name).toBe(fileName);
      expect(file.content).toBe('Test file content');
      expect(file.active).toBe(true);
      
      // List files
      const files = await filesHandler.listFiles();
      
      // Verify the file appears in the list
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBe(1);
      expect(files[0].name).toBe(fileName);
      
      // Get the file by name
      const retrievedFile = await filesHandler.getFile(fileName);
      
      // Verify retrieved file matches created file
      expect(retrievedFile).toBeDefined();
      expect(retrievedFile.name).toBe(fileName);
      expect(retrievedFile.content).toBe('Test file content');
      expect(retrievedFile.active).toBe(true);
    });
    
    it('should throw if file not found', async () => {
      const nonExistentFile = 'non-existent-file.txt';
      await expect(filesHandler.getFile(nonExistentFile)).rejects.toThrow();
    });
    
    it('should create an inactive file', async () => {
      // Create an inactive file
      const mockRequest = {
        json: () => Promise.resolve({
          content: 'Inactive file content',
          active: false
        })
      } as NextRequest;
      
      const fileName = 'inactive-file.txt';
      const file = await filesHandler.createFile(fileName, mockRequest);
      
      // Verify file was created with inactive status
      expect(file.active).toBe(false);
      
      // List active files - shouldn't include our file
      const activeFiles = await filesHandler.listFiles(true);
      expect(activeFiles.find(f => f.name === fileName)).toBeUndefined();
      
      // List inactive files - should include our file
      const inactiveFiles = await filesHandler.listFiles(false);
      expect(inactiveFiles.find(f => f.name === fileName)).toBeDefined();
    });
    
    it('should throw when creating a file that already exists', async () => {
      // Create a file
      const mockRequest = {
        json: () => Promise.resolve({
          content: 'Original content'
        })
      } as NextRequest;
      
      const fileName = 'duplicate.txt';
      await filesHandler.createFile(fileName, mockRequest);
      
      // Try to create the same file again
      await expect(filesHandler.createFile(fileName, mockRequest)).rejects.toThrow();
    });
  });

  describe('updateFile', () => {
    it('should update file content', async () => {
      // Create a file first
      const createRequest = {
        json: () => Promise.resolve({
          content: 'Original content'
        })
      } as NextRequest;
      
      const fileName = 'file-to-update.txt';
      await filesHandler.createFile(fileName, createRequest);
      
      // Update the file
      const updateRequest = {
        json: () => Promise.resolve({
          content: 'Updated content'
        })
      } as NextRequest;
      
      const updatedFile = await filesHandler.updateFile(fileName, updateRequest);
      
      // Verify the update
      expect(updatedFile).toBeDefined();
      expect(updatedFile.name).toBe(fileName);
      expect(updatedFile.content).toBe('Updated content');
      expect(updatedFile.active).toBe(true);
    });
    
    it('should throw when updating nonexistent file', async () => {
      const updateRequest = {
        json: () => Promise.resolve({
          content: 'Updated content'
        })
      } as NextRequest;
      
      const nonExistentFile = 'non-existent-file.txt';
      await expect(filesHandler.updateFile(nonExistentFile, updateRequest)).rejects.toThrow();
    });
  });

  describe('setFileActive', () => {
    it('should set a file as inactive', async () => {
      // Create an active file first
      const createRequest = {
        json: () => Promise.resolve({
          content: 'Active file content'
        })
      } as NextRequest;
      
      const fileName = 'active-to-inactive.txt';
      await filesHandler.createFile(fileName, createRequest);
      
      // Set the file as inactive
      const setActiveRequest = {
        json: () => Promise.resolve({
          active: false
        })
      } as NextRequest;
      
      const updatedFile = await filesHandler.setFileActive(fileName, setActiveRequest);
      
      // Verify the update
      expect(updatedFile).toBeDefined();
      expect(updatedFile.name).toBe(fileName);
      expect(updatedFile.active).toBe(false);
      
      // Verify it's in the inactive list
      const inactiveFiles = await filesHandler.listFiles(false);
      expect(inactiveFiles.find(f => f.name === fileName)).toBeDefined();
    });
    
    it('should set an inactive file as active', async () => {
      // Create an inactive file first
      const createRequest = {
        json: () => Promise.resolve({
          content: 'Inactive file content',
          active: false
        })
      } as NextRequest;
      
      const fileName = 'inactive-to-active.txt';
      await filesHandler.createFile(fileName, createRequest);
      
      // Set the file as active
      const setActiveRequest = {
        json: () => Promise.resolve({
          active: true
        })
      } as NextRequest;
      
      const updatedFile = await filesHandler.setFileActive(fileName, setActiveRequest);
      
      // Verify the update
      expect(updatedFile).toBeDefined();
      expect(updatedFile.name).toBe(fileName);
      expect(updatedFile.active).toBe(true);
      
      // Verify it's in the active list
      const activeFiles = await filesHandler.listFiles(true);
      expect(activeFiles.find(f => f.name === fileName)).toBeDefined();
    });
    
    it('should throw when setting active status for nonexistent file', async () => {
      const setActiveRequest = {
        json: () => Promise.resolve({
          active: false
        })
      } as NextRequest;
      
      const nonExistentFile = 'non-existent-file.txt';
      await expect(filesHandler.setFileActive(nonExistentFile, setActiveRequest)).rejects.toThrow();
    });
  });

  describe('deleteFile', () => {
    it('should delete a file', async () => {
      // Create a file first
      const createRequest = {
        json: () => Promise.resolve({
          content: 'File to delete'
        })
      } as NextRequest;
      
      const fileName = 'file-to-delete.txt';
      await filesHandler.createFile(fileName, createRequest);
      
      // Verify file exists
      const beforeDelete = await filesHandler.listFiles();
      expect(beforeDelete.find(f => f.name === fileName)).toBeDefined();
      
      // Delete the file
      await filesHandler.deleteFile(fileName);
      
      // Verify file is gone
      const afterDelete = await filesHandler.listFiles();
      expect(afterDelete.find(f => f.name === fileName)).toBeUndefined();
      
      // Verify getFile throws
      await expect(filesHandler.getFile(fileName)).rejects.toThrow();
    });
    
    it('should throw when deleting nonexistent file', async () => {
      const nonExistentFile = 'non-existent-file.txt';
      await expect(filesHandler.deleteFile(nonExistentFile)).rejects.toThrow();
    });
  });
});
