import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { join } from 'path';
import { writeFile } from 'fs/promises';
import { WorkspaceToolServer } from '../src/server';
import { createTestWorkspace, cleanupTestWorkspace } from './utils/test-helpers';

describe('Workspace Tool Server', () => {
  let server: WorkspaceToolServer;
  let workspace: any;
  let testDir: string;

  beforeEach(async () => {
    const setup = await createTestWorkspace();
    workspace = setup.workspace;
    testDir = setup.testDir;
    server = new WorkspaceToolServer(workspace);
  });

  afterEach(async () => {
    await cleanupTestWorkspace(testDir);
    await server.stop();
  });

  test('server initialization', () => {
    expect(server).toBeDefined();
    expect(server.name).toBe('workspace-tools');
    const tools = server.listTools();
    expect(tools).toContain('manage_dynamic_context');
    expect(tools).toContain('manage_files');
    expect(tools).toContain('manage_models');
    expect(tools).toContain('manage_prompt');
  });

  test('executes dynamic context operations', async () => {
    const result = await server.execute('manage_dynamic_context', {
      action: 'add',
      name: 'test-context',
      command: 'echo "test"',
      enabled: true
    });

    expect(result.success).toBe(true);
    
    const listResult = await server.execute('manage_dynamic_context', {
      action: 'list'
    });

    expect(listResult.data).toContainEqual({
      name: 'test-context',
      command: 'echo "test"',
      enabled: true
    });
  });

  test('executes file operations', async () => {
    const filePath = 'test.txt';
    const content = 'test content';

    const result = await server.execute('manage_files', {
      action: 'add',
      path: filePath,
      content
    });

    expect(result.success).toBe(true);

    const readResult = await server.execute('manage_files', {
      action: 'read',
      path: filePath
    });

    expect(readResult.data.content).toBe(content);
  });

  test('executes model operations', async () => {
    const result = await server.execute('manage_models', {
      action: 'add',
      provider: 'test',
      model: 'model-1',
      apiKey: 'test-key'
    });

    expect(result.success).toBe(true);

    const listResult = await server.execute('manage_models', {
      action: 'list'
    });

    expect(listResult.data).toContainEqual(expect.objectContaining({
      provider: 'test',
      model: 'model-1'
    }));
  });

  test('executes prompt operations', async () => {
    const prompt = 'Test system prompt';

    const result = await server.execute('manage_prompt', {
      action: 'update',
      prompt
    });

    expect(result.success).toBe(true);

    const getResult = await server.execute('manage_prompt', {
      action: 'get'
    });

    expect(getResult.data.prompt).toBe(prompt);
  });

  test('handles invalid tool names', async () => {
    await expect(server.execute('invalid_tool', {}))
      .rejects
      .toThrow('Tool not found: invalid_tool');
  });

  test('handles tool execution errors', async () => {
    // Try to read non-existent file
    await expect(server.execute('manage_files', {
      action: 'read',
      path: 'nonexistent.txt'
    })).rejects.toThrow();
  });

  test('updates working directory', async () => {
    const newDir = join(testDir, 'subdir');
    server.setWorkingDir(newDir);

    // Create a file in new directory
    const result = await server.execute('manage_files', {
      action: 'add',
      path: 'test.txt',
      content: 'test'
    });

    expect(result.success).toBe(true);
  });
});