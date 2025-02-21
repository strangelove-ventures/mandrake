import { join } from 'path';
import { mkdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { WorkspaceManager } from '@mandrake/workspace';
import { WorkspaceToolContext } from '../../src/types';

/**
 * Create a temporary workspace for testing
 */
export async function createTestWorkspace(): Promise<{
  workspace: WorkspaceManager;
  context: WorkspaceToolContext;
  testDir: string;
}> {
  const testRoot = join(tmpdir(), `workspace-test-${Date.now()}`);
  const testDir = join(testRoot, 'test-workspace');
  
  await mkdir(testDir, { recursive: true });
  
  const workspace = new WorkspaceManager(testDir);
  const context: WorkspaceToolContext = {
    workspace,
    workingDir: testDir,
    allowedDirs: [testDir]
  };

  return { workspace, context, testDir };
}

/**
 * Clean up a test workspace
 */
export async function cleanupTestWorkspace(testDir: string): Promise<void> {
  try {
    await rm(dirname(testDir), { recursive: true, force: true });
  } catch (error) {
    console.error('Failed to clean up test directory:', error);
  }
}

/**
 * Creates a mock WorkspaceManager for unit testing
 */
export function createMockWorkspaceManager(): WorkspaceManager {
  return {
    dynamicContextManager: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      list: jest.fn()
    },
    filesManager: {
      writeFile: jest.fn(),
      readFile: jest.fn(),
      deleteFile: jest.fn(),
      listFiles: jest.fn()
    },
    modelManager: {
      addModel: jest.fn(),
      removeModel: jest.fn(),
      enableModel: jest.fn(),
      listModels: jest.fn()
    },
    promptManager: {
      getPrompt: jest.fn(),
      setPrompt: jest.fn()
    }
  } as unknown as WorkspaceManager;
}