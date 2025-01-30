// packages/types/src/workspace/files.ts
import path from 'path'
import fs from 'fs/promises'
import { getWorkspacesDir } from './core'
import type {
  Workspace,
  ToolsConfig,
  ModelsConfig,
  ContextConfig,
  WorkspaceFullConfig
} from './types'

// Ensure directory exists
export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

// Basic workspace metadata
export async function readWorkspaceConfig(workspaceName: string): Promise<Workspace> {
  const fullPath = path.join(getWorkspacesDir(), workspaceName, 'workspace.json')
  const content = await fs.readFile(fullPath, 'utf-8')
  return JSON.parse(content)
}

export async function writeWorkspaceConfig(workspaceName: string, config: Workspace) {
  const fullPath = path.join(getWorkspacesDir(), workspaceName, 'workspace.json')
  await fs.writeFile(fullPath, JSON.stringify(config, null, 2))
}

// Tools configuration
export async function readToolsConfig(workspaceName: string): Promise<ToolsConfig> {
  const fullPath = path.join(getWorkspacesDir(), workspaceName, 'config', 'tools.json')
  const content = await fs.readFile(fullPath, 'utf-8')
  return JSON.parse(content)
}

export async function writeToolsConfig(workspaceName: string, config: ToolsConfig) {
  const fullPath = path.join(getWorkspacesDir(), workspaceName, 'config', 'tools.json')
  await fs.writeFile(fullPath, JSON.stringify(config, null, 2))
}

// Models configuration
export async function readModelsConfig(workspaceName: string): Promise<ModelsConfig> {
  const fullPath = path.join(getWorkspacesDir(), workspaceName, 'config', 'models.json')
  const content = await fs.readFile(fullPath, 'utf-8')
  return JSON.parse(content)
}

export async function writeModelsConfig(workspaceName: string, config: ModelsConfig) {
  const fullPath = path.join(getWorkspacesDir(), workspaceName, 'config', 'models.json')
  await fs.writeFile(fullPath, JSON.stringify(config, null, 2))
}

// Context configuration
export async function readContextConfig(workspaceName: string): Promise<ContextConfig> {
  const fullPath = path.join(getWorkspacesDir(), workspaceName, 'config', 'context.json')
  const content = await fs.readFile(fullPath, 'utf-8')
  return JSON.parse(content)
}

export async function writeContextConfig(workspaceName: string, config: ContextConfig) {
  const fullPath = path.join(getWorkspacesDir(), workspaceName, 'config', 'context.json')
  await fs.writeFile(fullPath, JSON.stringify(config, null, 2))
}

// System prompt
export async function readSystemPrompt(workspaceName: string): Promise<string> {
  const fullPath = path.join(getWorkspacesDir(), workspaceName, 'config', 'system-prompt.md')
  return fs.readFile(fullPath, 'utf-8')
}

export async function writeSystemPrompt(workspaceName: string, content: string) {
  const fullPath = path.join(getWorkspacesDir(), workspaceName, 'config', 'system-prompt.md')
  await fs.writeFile(fullPath, content)
}

// Read full workspace configuration
export async function readFullWorkspaceConfig(workspaceName: string): Promise<WorkspaceFullConfig> {
  const [tools, models, context, systemPrompt] = await Promise.all([
    readToolsConfig(workspaceName),
    readModelsConfig(workspaceName),
    readContextConfig(workspaceName),
    readSystemPrompt(workspaceName)
  ])

  return {
    tools,
    models,
    context,
    systemPrompt
  }
}

// Context file operations
export async function readContextFiles(workspaceName: string) {
  const contextDir = path.join(getWorkspacesDir(), workspaceName, 'context', 'files')
  const files = await fs.readdir(contextDir, { withFileTypes: true })

  return files.filter(f => f.isFile()).map(f => ({
    name: f.name,
    path: path.join(contextDir, f.name)
  }))
}

// Helper for getting workspace paths
export function getWorkspacePath(workspaceName: string) {
  const base = path.join(getWorkspacesDir(), workspaceName)
  return {
    root: base,
    config: path.join(base, 'config'),
    contextFiles: path.join(base, 'context', 'files'),
    src: path.join(base, 'src'),
    workspace: path.join(base, 'workspace.json'),
    tools: path.join(base, 'config', 'tools.json'),
    models: path.join(base, 'config', 'models.json'),
    context: path.join(base, 'config', 'context.json'),
    systemPrompt: path.join(base, 'config', 'system-prompt.md')
  }
}