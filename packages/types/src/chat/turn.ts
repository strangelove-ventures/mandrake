export interface Turn {
    id: string;
    responseId: string;
    index: number;
    content?: string;
    toolCall?: {
        server: string;
        name: string;
        input: any;
    };
    toolResult?: any;
}