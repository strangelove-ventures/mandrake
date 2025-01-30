import { readToolsConfig, writeToolsConfig } from './files'
import type { ServerConfig } from '../'

export async function getWorkspaceTools(workspacePath: string): Promise<ServerConfig[]> {
  const config = await readToolsConfig(workspacePath)
  return config.tools
}

export async function addWorkspaceTool(workspacePath: string, tool: ServerConfig) {
  const tools = await getWorkspaceTools(workspacePath)
  
  // Check for duplicate IDs
  if (tools.some(t => t.id === tool.id)) {
    throw new Error(`Tool with ID ${tool.id} already exists`)
  }

  tools.push(tool)
  await writeToolsConfig(workspacePath, { tools })
}

export async function updateWorkspaceTool(workspacePath: string, toolId: string, updates: Partial<ServerConfig>) {
  const tools = await getWorkspaceTools(workspacePath)
  const index = tools.findIndex(t => t.id === toolId)
  
  if (index === -1) {
    throw new Error(`Tool ${toolId} not found`)
  }

  tools[index] = { ...tools[index], ...updates }
  await writeToolsConfig(workspacePath, {tools})
}

export async function removeWorkspaceTool(workspacePath: string, toolId: string) {
  const tools = await getWorkspaceTools(workspacePath)
  const filtered = tools.filter(t => t.id !== toolId)
  
  if (filtered.length === tools.length) {
    throw new Error(`Tool ${toolId} not found`)
  }

  await writeToolsConfig(workspacePath, { tools: filtered })
}

// Helper to replace {workspacePath} in volume configs
export function resolveToolVolumes(tool: ServerConfig, workspacePath: string): ServerConfig {
  if (!tool.volumes) return tool

  return {
    ...tool,
    volumes: tool.volumes.map(vol => ({
      ...vol,
      source: vol.source.replace('{workspacePath}', workspacePath)
    }))
  }
}