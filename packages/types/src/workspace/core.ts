import path from 'path'
import fs from 'fs/promises'
import os from 'os'
import { ensureDir, readWorkspaceConfig, writeWorkspaceConfig } from './files'
import { initWorkspaceConfig } from './config'
import type { Workspace } from './types'
import { WorkspaceError } from './types'

export const MANDRAKE_DIR = path.join(os.homedir(), '.mandrake')
export const WORKSPACES_DIR = path.join(MANDRAKE_DIR, 'workspaces')

export function getMandrakeDir(): string {
  // Always append .mandrake to whatever base directory we're using
  const baseDir = process.env.MANDRAKE_DIR || os.homedir()
  return path.join(baseDir, '.mandrake')
}

export const getWorkspacesDir = () => path.join(getMandrakeDir(), 'workspaces')

export async function initMandrakeDir() {
  await ensureDir(getMandrakeDir())
  await ensureDir(getWorkspacesDir())
}

export function validateWorkspaceName(name: string): boolean {
  return /^[a-zA-Z0-9-_]+$/.test(name)
}

export async function listWorkspaces(): Promise<Workspace[]> {
  await initMandrakeDir()

  const workspaces: Workspace[] = []
  const workspaceDirs = await fs.readdir(getWorkspacesDir())

  for (const dir of workspaceDirs) {
    try {
      const workspace = await readWorkspaceConfig(path.join(getWorkspacesDir(), dir))
      workspaces.push(workspace)
    } catch (error) {
      console.warn(`Failed to read workspace ${dir}:`, error)
    }
  }

  return workspaces
}

export async function createWorkspace(
  name: string,
  id: string,  // Required ID from database
  description?: string
): Promise<Workspace> {
  if (!validateWorkspaceName(name)) {
    throw new WorkspaceError('Invalid workspace name')
  }

  const workspacePath = path.join(getWorkspacesDir(), name)

  // First ensure parent directories exist
  await ensureDir(getWorkspacesDir())

  try {
    // Try to create the workspace directory - this is atomic
    await fs.mkdir(workspacePath)
  } catch (error: any) {
    if (error.code === 'EEXIST') {
      throw new WorkspaceError('Workspace already exists')
    }
    throw error
  }

  // Now create workspace structure and config
  const workspace = {
    id,
    name,
    description,
    created: new Date().toISOString()
  }

  // Create subdirs and config files
  await Promise.all([
    ensureDir(path.join(workspacePath, 'config')),
    ensureDir(path.join(workspacePath, 'context', 'files')),
    ensureDir(path.join(workspacePath, 'src'))
  ])

  // Write the workspace config
  await writeWorkspaceConfig(workspacePath, workspace)

  return workspace
}