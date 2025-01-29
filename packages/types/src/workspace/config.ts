import path from 'path'
import { ensureDir } from './files'
import { writeToolsConfig, writeModelsConfig, writeContextConfig, writeSystemPrompt } from './files'
import type { WorkspaceConfig } from './types'

async function ensureConfigDirs(workspacePath: string) {
  await ensureDir(path.join(workspacePath, 'config'))
  await ensureDir(path.join(workspacePath, 'context', 'files'))
  await ensureDir(path.join(workspacePath, 'src'))
}

export async function getDefaultConfig(): Promise<WorkspaceConfig> {
  return {
    tools: [
      {
        id: 'filesystem',
        name: `filesystem-${Date.now()}`,
        image: 'mandrake/mcp-filesystem:latest',
        command: ['/workspace'],
        execCommand: ['/app/dist/index.js', '/workspace'],
        volumes: [{
          source: '{workspacePath}',
          target: '/workspace',
          mode: 'rw'
        }]
      },
      {
        id: 'git',
        name: `git-${Date.now()}`,
        image: 'mandrake/mcp-git:latest',
        command: [],
        execCommand: ['mcp-server-git'],
        volumes: [{
          source: '{workspacePath}',
          target: '/workspace',
          mode: 'rw'
        }]
      },
      {
        id: 'fetch',
        name: `fetch-${Date.now()}`,
        image: 'mandrake/mcp-fetch:latest',
        command: [],
        execCommand: ['mcp-server-fetch']
      }
    ],
    models: {
      baseURL: 'https://api.openai.com/v1/engines/davinci-codex/completions',
      maxTokens: 16000,
      temperature: 0.7
    },
    context: {
      refresh: {
        git: { enabled: true, interval: '1h' },
        filesystem: { enabled: true, onDemand: true }
      }
    }
  }
}

const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant.`

export async function initWorkspaceConfig(workspacePath: string) {
  // Ensure all required directories exist
  await ensureConfigDirs(workspacePath)
  
  // Get default configuration
  const config = await getDefaultConfig()
  
  // Write all config files
  await Promise.all([
    writeToolsConfig(workspacePath, config.tools),
    writeModelsConfig(workspacePath, config.models),
    writeContextConfig(workspacePath, config.context),
    writeSystemPrompt(workspacePath, DEFAULT_SYSTEM_PROMPT)
  ])
}

export async function validateConfig(config: Partial<WorkspaceConfig>): Promise<string[]> {
  const errors: string[] = []
  
  if (config.tools) {
    // Validate tool configurations
    config.tools.forEach((tool, index) => {
      if (!tool.id) errors.push(`Tool at index ${index} missing id`)
      if (!tool.name) errors.push(`Tool at index ${index} missing name`)
      if (!tool.image) errors.push(`Tool at index ${index} missing image`)
    })
  }

  if (config.models) {
    // Validate model configuration
    if (!config.models.baseURL) errors.push('Model provider is required')
    if (config.models.maxTokens && config.models.maxTokens < 1) {
      errors.push('Max tokens must be greater than 0')
    }
  }

  return errors
}
