import { PrismaClient } from '@prisma/client';

// Create prisma instance for this file
const prisma = new PrismaClient();

export async function ensureDefaultWorkspace() {
    // Try to find existing default workspace
    let workspace = await prisma.workspace.findFirst({
        where: {
            name: 'default'
        }
    });

    // Create if it doesn't exist
    if (!workspace) {
        workspace = await prisma.workspace.create({
            data: {
                name: 'default',
                description: 'Default workspace',
                config: {}
            }
        });
        console.log('Created default workspace:', workspace.id);
    }

    return workspace;
}