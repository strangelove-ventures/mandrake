import path from 'path'
import fs from 'fs/promises'
import os from 'os'
import { ensureDir, readWorkspaceConfig, writeWorkspaceConfig } from './files'
import { initWorkspaceConfig } from './config'
import type { Workspace } from './types'
import { WorkspaceError } from './types'

let mandrakeDir: string | undefined

export function resetMandrakeDir() {
  mandrakeDir = undefined
}

export function getMandrakeDir(): string {
  if (mandrakeDir) return mandrakeDir
  const baseDir = process.env.MANDRAKE_DIR || os.homedir()
  mandrakeDir = path.join(baseDir, '.mandrake')
  return mandrakeDir
}

export function getWorkspacesDir(): string {
  return path.join(getMandrakeDir(), 'workspaces')
}
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
  const workspacesDir = getWorkspacesDir()

  const workspaceDirs = await fs.readdir(workspacesDir)

  for (const dir of workspaceDirs) {
    try {
      const fullPath = path.join(workspacesDir, dir)
      const workspace = await readWorkspaceConfig(dir)
      workspaces.push(workspace)
    } catch (error) {
      console.warn(`Failed to read workspace ${dir}:`, error)
    }
  }

  return workspaces
}

// packages/types/src/workspace/core.ts
export async function createWorkspace(
  name: string,
  id: string,
  description?: string
): Promise<Workspace> {
  if (!validateWorkspaceName(name)) {
    throw new WorkspaceError('Invalid workspace name')
  }

  const workspacePath = path.join(getWorkspacesDir(), name)

  await ensureDir(getWorkspacesDir())

  try {
    await fs.mkdir(workspacePath)
  } catch (error: any) {
    if (error.code === 'EEXIST') {
      throw new WorkspaceError('Workspace already exists')
    }
    throw error
  }

  const workspace = {
    id,
    name,
    description,
    created: new Date().toISOString()
  }

  await Promise.all([
    ensureDir(path.join(workspacePath, 'config')),
    ensureDir(path.join(workspacePath, 'context', 'files')),
    ensureDir(path.join(workspacePath, 'src'))
  ])

  // Write configs with just the name
  await Promise.all([
    writeWorkspaceConfig(name, workspace),
    initWorkspaceConfig(name)
  ])

  return workspace
}
