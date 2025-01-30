import { createWorkspace } from '@mandrake/types'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function ensureDefaultWorkspace() {
    // Try to find existing default workspace
    let workspace = await prisma.workspace.findFirst({
        where: { name: 'default' }
    })

    // Create if it doesn't exist
    if (!workspace) {
        workspace = await prisma.workspace.create({
            data: {
                name: 'default',
                description: 'Default workspace',
                config: {}
            }
        })
        console.log('Created default workspace:', workspace.id)

        // Create filesystem structure
        await createWorkspace('default', workspace.id, 'Default workspace')
    }

    return workspace
}