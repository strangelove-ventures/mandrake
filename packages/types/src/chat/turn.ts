export interface Turn {
    id: string
    responseId: string
    index: number
    toolCall?: {
        server: string
        name: string
        input: any
    }
    toolResult?: any
    content?: string
}