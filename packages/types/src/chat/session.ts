import { Round } from './round'
export interface Session {
    id: string
    title?: string
    rounds: Round[]
    workspaceId: string
    createdAt: string
    updatedAt: string
}

