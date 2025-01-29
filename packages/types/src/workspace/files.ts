import fs from 'fs/promises'
import path from 'path'
import type { Workspace } from './types'

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

export async function readWorkspaceConfig(workspacePath: string): Promise<Workspace> {
  const content = await fs.readFile(path.join(workspacePath, 'workspace.json'), 'utf-8')
  return JSON.parse(content)
}

export async function writeWorkspaceConfig(workspacePath: string, config: Workspace) {
  await fs.writeFile(
    path.join(workspacePath, 'workspace.json'),
    JSON.stringify(config, null, 2)
  )
}

export async function readToolsConfig(workspacePath: string) {
  const content = await fs.readFile(path.join(workspacePath, 'config', 'tools.json'), 'utf-8')
  return JSON.parse(content)
}

export async function writeToolsConfig(workspacePath: string, config: any) {
  await fs.writeFile(
    path.join(workspacePath, 'config', 'tools.json'),
    JSON.stringify(config, null, 2)
  )
}

export async function readModelsConfig(workspacePath: string) {
  const content = await fs.readFile(path.join(workspacePath, 'config', 'models.json'), 'utf-8')
  return JSON.parse(content)
}

export async function writeModelsConfig(workspacePath: string, config: any) {
  await fs.writeFile(
    path.join(workspacePath, 'config', 'models.json'),
    JSON.stringify(config, null, 2)
  )
}

export async function readContextConfig(workspacePath: string) {
  const content = await fs.readFile(path.join(workspacePath, 'config', 'context.json'), 'utf-8')
  return JSON.parse(content)
}

export async function writeContextConfig(workspacePath: string, config: any) {
  await fs.writeFile(
    path.join(workspacePath, 'config', 'context.json'),
    JSON.stringify(config, null, 2)
  )
}

export async function readSystemPrompt(workspacePath: string): Promise<string> {
  return fs.readFile(path.join(workspacePath, 'config', 'system-prompt.md'), 'utf-8')
}

export async function writeSystemPrompt(workspacePath: string, content: string) {
  await fs.writeFile(path.join(workspacePath, 'config', 'system-prompt.md'), content)
}

export async function readContextFiles(workspacePath: string) {
  const contextDir = path.join(workspacePath, 'context', 'files')
  const files = await fs.readdir(contextDir, { withFileTypes: true })
  
  return files.filter(f => f.isFile()).map(f => ({
    name: f.name,
    path: path.join(contextDir, f.name)
  }))
}