import { MCPServerImpl } from './server'
import type { ServerConfig, ServerState, MCPTool } from './types'

export class MCPManager {
  private servers: Map<string, MCPServerImpl>
  
  constructor() {
    this.servers = new Map()
  }

  async startServer(id: string, config: ServerConfig) {
    if (this.servers.has(id)) {
      throw new Error(`Server ${id} already exists`)
    }

    try {
      const server = new MCPServerImpl(id, config)
      await server.start()
      this.servers.set(id, server)
    } catch (error) {
      console.error(`Failed to start server ${id}:`, error)
      throw error
    }
  }

  async stopServer(name: string) {
    const server = this.servers.get(name)
    if (!server) {
      throw new Error(`Server ${name} not found`)
    }
    
    await server.stop()
    this.servers.delete(name)
  }

  async updateServer(id: string, config: ServerConfig) {
    const server = this.servers.get(id)
    if (!server) {
      throw new Error(`Server ${id} not found`)
    }

    await this.stopServer(id)
    await this.startServer(id, config)
  }

  async listAllTools(): Promise<Array<MCPTool & { server: string }>> {
    const allTools: Array<MCPTool & { server: string }> = []
    
    for (const [id, server] of this.servers) {
      if (!server.getConfig().disabled) {
        const tools = await server.listTools()
        allTools.push(...tools.map(tool => ({
          ...tool,
          server: id
        })))
      }
    }
    
    return allTools
  }

  async invokeTool(id: string, method: string, args: Record<string, any>) {
    const server = this.servers.get(id)
    if (!server) {
      throw new Error(`Server ${id} not found`)
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
