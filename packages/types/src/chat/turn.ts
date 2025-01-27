export interface Turn {
    id: string;
    responseId: string;
    index: number;
}

export interface TextTurn extends Turn {
    type: 'text';
    content: string;
}

export interface ToolTurn extends Turn {
    type: 'tool';
    toolCall: {
        server: string;
        name: string;
        input: any;
    };
    toolResult?: any;
}

export type ResponseTurn = TextTurn | ToolTurn;