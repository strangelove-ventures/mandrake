import path from 'path'
import { ensureDir } from './files'
import { writeToolsConfig, writeModelsConfig, writeContextConfig, writeSystemPrompt } from './files'
import type { WorkspaceFullConfig } from './types'
import { getWorkspacesDir } from './core'

async function ensureConfigDirs(workspacePath: string) {
  await ensureDir(path.join(workspacePath, 'config'))
  await ensureDir(path.join(workspacePath, 'context', 'files'))
  await ensureDir(path.join(workspacePath, 'src'))
}

const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant.`
export async function getDefaultConfig(): Promise<WorkspaceFullConfig> {
  return {
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    tools: {
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
    ]},
    models: {
      baseURL: 'https://api.openai.com/v1/engines/davinci-codex/completions',
      maxTokens: 16000,
      temperature: 0.7,
      provider: ''
    },
    context: {
      refresh: {
        git: { enabled: true, interval: '1h' },
        filesystem: { enabled: true, onDemand: true }
      }
    }
  }
}


export async function initWorkspaceConfig(workspaceName: string) {
  const workspacePath = path.join(getWorkspacesDir(), workspaceName)
  await ensureConfigDirs(workspacePath)
  const config = await getDefaultConfig()

  await Promise.all([
    writeToolsConfig(workspaceName, config.tools),
    writeModelsConfig(workspaceName, config.models),
    writeContextConfig(workspaceName, config.context),
    writeSystemPrompt(workspaceName, config.systemPrompt)
  ])
}

export async function validateConfig(config: Partial<WorkspaceFullConfig>): Promise<string[]> {
  const errors: string[] = []
  
  if (config.tools) {
    // Validate tool configurations
    config.tools.tools.forEach((tool, index) => {
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
