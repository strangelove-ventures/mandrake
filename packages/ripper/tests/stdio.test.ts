import { describe, test, expect, afterEach, beforeEach } from 'bun:test'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { join } from 'path'
import { tmpdir } from 'os'
import { mkdir, rm, realpath } from 'fs/promises'

describe('Stdio Transport', () => {
    const tmpDir = join(tmpdir(), `ripper-stdio-${Date.now()}`)
    let client: Client
    let server: Server

    beforeEach(async () => {
        await mkdir(tmpDir, { recursive: true })
        server = new Server(
            { name: 'test', version: '1.0.0' },
            { capabilities: { tools: {} } }
        )

        const serverTransport = new StdioServerTransport()
        await server.connect(serverTransport)

        client = new Client(
            { name: 'test-client', version: '1.0.0' },
            { capabilities: {} }
        )

        const clientTransport = new StdioClientTransport({
            command: 'bun',
            args: [
                'run',
                join(__dirname, '../dist/server.js'),
                '--transport=stdio',
                `--workspaceDir=${tmpDir}`
            ]
        })
        await client.connect(clientTransport)
    })

    afterEach(async () => {
        await client?.close()
        await server?.close()
        await rm(tmpDir, { recursive: true, force: true })
    })


    test('basic connection', async () => {
        // Test succeeds if beforeEach completes
        expect(client).toBeDefined()
        expect(server).toBeDefined()
    })

    test('can list directory', async () => {
        const resolvedTmpDir = await realpath(tmpDir)
        const result = await client.callTool({
            name: 'list_directory',
            arguments: {
                path: tmpDir,
                allowedDirs: [tmpDir]
            }
        })

        expect((result.content as any)[0].type).toBe('text')
        const listing = JSON.parse((result.content as any)[0].text)
        expect(listing.path).toBe(resolvedTmpDir)
        expect(Array.isArray(listing.items)).toBe(true)
    })
})

// TODO: figure out how to make this work
// describe('Docker Transport', () => {
//     const tmpDir = join(tmpdir(), `ripper-docker-${Date.now()}`)
//     let client: Client
//     let server: Server

//     beforeEach(async () => {
//         await mkdir(tmpDir, { recursive: true, mode: 0o777 })

//         server = new Server(
//             { name: 'test', version: '1.0.0' },
//             { capabilities: { tools: {} } }
//         )

//         const serverTransport = new StdioServerTransport()
//         await server.connect(serverTransport)

//         client = new Client(
//             { name: 'test-client', version: '1.0.0' },
//             { capabilities: {} }
//         )

//         const clientTransport = new StdioClientTransport({
//             command: 'docker',
//             args: [
//                 'run',
//                 '--rm',
//                 '-i',
//                 '--mount', `type=bind,src=${tmpDir},dst=/ws`,
//                 'mandrake/ripper:latest'
//             ]
//         })
//         await client.connect(clientTransport)
//     })

//     afterEach(async () => {
//         await client?.close()
//         await server?.close()
//         await rm(tmpDir, { recursive: true, force: true })
//     })

//     test('basic connection', async () => {
//         expect(client).toBeDefined()
//         expect(server).toBeDefined()
//     })

//     test('can list directory', async () => {
//         const result = await client.callTool({
//             name: 'list_directory',
//             arguments: {
//                 path: '/ws',
//                 allowedDirs: ['/ws']
//             }
//         })

//         expect((result.content as any)[0].type).toBe('text')
//         const listing = JSON.parse((result.content as any)[0].text)
//         expect(listing.path).toBe('/ws')
//         expect(Array.isArray(listing.items)).toBe(true)
//     })
// })
