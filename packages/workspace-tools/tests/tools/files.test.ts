import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { filesManagementTool } from '../../src/tools/files';
import { WorkspaceToolContext } from '../../src/types';
import { createTestWorkspace, cleanupTestWorkspace } from '../utils/test-helpers';

describe('Files Management Tool', () => {
  let workspace: any;
  let context: WorkspaceToolContext;
  let testDir: string;

  beforeEach(async () => {
    const setup = await createTestWorkspace();
    workspace = setup.workspace;
    context = setup.context;
    testDir = setup.testDir;
  });

  afterEach(async () => {
    await cleanupTestWorkspace(testDir);
  });

  test('full file lifecycle', async () => {
    // Add new file
    const testPath = 'test.txt';
    const content = 'Hello, World!';
    
    await filesManagementTool.execute({
      action: 'add',
      path: testPath,
      content
    }, context);

    // Verify file exists with correct content
    const fileContent = await readFile(join(testDir, testPath), 'utf-8');
    expect(fileContent).toBe(content);

    // Read file through tool
    let result = await filesManagementTool.execute({
      action: 'read',
      path: testPath
    }, context);
    expect(result.data.content).toBe(content);

    // Update file
    const newContent = 'Updated content';
    await filesManagementTool.execute({
      action: 'update',
      path: testPath,
      content: newContent
    }, context);

    // Verify update
    result = await filesManagementTool.execute({
      action: 'read',
      path: testPath
    }, context);
    expect(result.data.content).toBe(newContent);

    // List files
    result = await filesManagementTool.execute({
      action: 'list'
    }, context);
    expect(result.data).toContain(testPath);

    // Remove file
    await filesManagementTool.execute({
      action: 'remove',
      path: testPath
    }, context);

    // Verify removal
    result = await filesManagementTool.execute({
      action: 'list'
    }, context);
    expect(result.data).not.toContain(testPath);
  });

  test('creates files in nested directories', async () => {
    const nestedPath = 'nested/dir/test.txt';
    const content = 'Nested file content';

    await filesManagementTool.execute({
      action: 'add',
      path: nestedPath,
      content
    }, context);

    const result = await filesManagementTool.execute({
      action: 'read',
      path: nestedPath
    }, context);

    expect(result.data.content).toBe(content);
  });

  test('handles non-existent files', async () => {
    await expect(filesManagementTool.execute({
      action: 'read',
      path: 'nonexistent.txt'
    }, context)).rejects.toThrow();

    await expect(filesManagementTool.execute({
      action: 'remove',
      path: 'nonexistent.txt'
    }, context)).rejects.toThrow();
  });

  test('validates required parameters', async () => {
    // Missing path
    await expect(filesManagementTool.execute({
      action: 'add',
      content: 'test'
    }, context)).rejects.toThrow();

    // Missing content
    await expect(filesManagementTool.execute({
      action: 'add',
      path: 'test.txt'
    }, context)).rejects.toThrow();
  });
});