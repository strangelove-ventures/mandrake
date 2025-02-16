import { MCPServerImpl } from './server'
import type { ServerConfig, ServerState, MCPTool } from './types'

export class MCPManager {
  private servers: Map<string, MCPServerImpl>
  
  constructor() {
    this.servers = new Map()
  }

  async startServer(config: ServerConfig) {
    if (this.servers.has(config.name)) {
      throw new Error(`Server ${config.name} already exists`)
    }

    const server = new MCPServerImpl(config)
    await server.start()
    this.servers.set(config.name, server)
  }

  async stopServer(name: string) {
    const server = this.servers.get(name)
    if (!server) {
      throw new Error(`Server ${name} not found`)
    }
    
    await server.stop()
    this.servers.delete(name)
  }

  async updateServer(name: string, config: ServerConfig) {
    const server = this.servers.get(name)
    if (!server) {
      throw new Error(`Server ${name} not found`)
    }

    await this.stopServer(name)
    await this.startServer(config)
  }

  async listAllTools(): Promise<Array<MCPTool & { server: string }>> {
    const allTools: Array<MCPTool & { server: string }> = []
    
    for (const [name, server] of this.servers) {
      if (!server.getConfig().disabled) {
        const tools = await server.listTools()
        allTools.push(...tools.map(tool => ({
          ...tool,
          server: name
        })))
      }
    }
    
    return allTools
  }

  async invokeTool(serverName: string, method: string, args: Record<string, any>) {
    const server = this.servers.get(serverName)
    if (!server) {
      throw new Error(`Server ${serverName} not found`)
    }

    return server.invokeTool(method, args)
  }

  getServerState(name: string): ServerState | undefined {
    return this.servers.get(name)?.getState()
  }

  getServer(name: string): MCPServerImpl | undefined {
    return this.servers.get(name)
  }

  async cleanup() {
    const stopPromises = Array.from(this.servers.values())
      .map(server => server.stop())
    
    await Promise.all(stopPromises)
    this.servers.clear()
  }
}
