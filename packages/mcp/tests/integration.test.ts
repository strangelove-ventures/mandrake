import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { MCPServerImpl } from '../src/server'
import { MCPManager } from '../src/manager'
import type { ServerConfig } from '../src/types'

describe('MCP Integration', () => {
    const config: ServerConfig = {
        name: 'test',
        command: 'node',
        args: ['./tests/server/dist/index.js']
    }

    describe('MCPServerImpl', () => {
        let server: MCPServerImpl

        beforeEach(() => {
            server = new MCPServerImpl(config)
        })

        afterEach(async () => {
            await server.stop()
        })

        test('starts and lists tools', async () => {
            await server.start()
            const tools = await server.listTools()
            
            expect(tools).toHaveLength(3)
            expect(tools.map(t => t.name)).toContain('add')
            expect(tools.map(t => t.name)).toContain('echo')
            expect(tools.map(t => t.name)).toContain('error')
        })

        test('invokes add tool', async () => {
            await server.start()
            const result = await server.invokeTool('add', { a: 1, b: 2 })
            expect((result.content as any)[0].text).toBe('3')
        })

        test('handles tool errors', async () => {
            await server.start()
            await expect(server.invokeTool('error', {}))
                .rejects
                .toMatchObject({ message: 'Test error' })
        })
    })

    describe('MCPManager', () => {
        let manager: MCPManager

        beforeEach(() => {
            manager = new MCPManager()
        })

        afterEach(async () => {
            await manager.cleanup()
        })

        test('starts multiple servers', async () => {
            const config2 = { ...config, name: 'test2' }
            
            await manager.startServer(config)
            await manager.startServer(config2)

            const tools = await manager.listAllTools()
            expect(tools.length).toBe(6) // 3 tools from each server
        })

        test('invokes tools across servers', async () => {
            await manager.startServer(config)
            
            const result = await manager.invokeTool('test', 'add', { a: 1, b: 2 })
            expect((result.content as any)[0].text).toBe('3')
        })
    })
})