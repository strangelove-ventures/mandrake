import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import {
    getSessionMessages,
    newRoundForSession,
    newToolCallTurn,
    newToolResultTurn,
    newContentTurn,
    getOrCreateSession
} from '@mandrake/storage';
import { mcpService } from './mcp';
// import { Turn, TextTurn, ToolTurn } from '@mandrake/types';

export class ToolChat {
    private llm: ChatOpenAI;
    private jsonBuffer: string = '';

    constructor() {
        this.llm = new ChatOpenAI({
            streaming: true,
            modelName: "deepseek-chat",
            maxTokens: 4096,
            temperature: 0.7,
            configuration: {
                baseURL: "https://api.deepseek.com/v1",
                apiKey: process.env.DEEPSEEK_API_KEY,
            }
        });
    }

    private async buildMessageHistory(message: string, sessionId?: string) {
        // Get history if session exists
        const messages = sessionId
            ? await getSessionMessages(sessionId)
            : [];

        // Load system prompt externally and convert all to LangChain message format
        const systemMessage = await this.loadSystemPrompt();
        return [
            new SystemMessage(systemMessage),
            ...messages.map(msg =>
                msg.role === 'user'
                    ? new HumanMessage(msg.content)
                    : new AIMessage(msg.content)
            ),
            new HumanMessage(message)
        ];
    }

    async streamChat(message: string, workspaceId: string, sessionId?: string) {
        console.log('ToolChat.streamChat called with:', { message, workspaceId, sessionId });
        // bind self to the class
        const self = this;
        // Initialize session and round
        const session = await getOrCreateSession(
            workspaceId,
            sessionId,
            message.slice(0, 50)
        );

        console.log('Session created/retrieved:', session);

        const round = await newRoundForSession(session.id, message);
        console.log('Round created:', round);
        if (!round) throw new Error('Failed to create round');

        return new ReadableStream({
            async start(controller) {
                console.log('Starting stream...');
                const encoder = new TextEncoder();
                const sendChunk = (type: string, content: any) => {
                    console.log('Sending chunk:', { type, content });
                    controller.enqueue(
                        encoder.encode(JSON.stringify({ type, content }) + '\
')
                    );
                };

                try {
                    // Start streaming with message history
                    console.log('Building message history...');
                    const messageHistory = await self.buildMessageHistory(message, session.id);
                    console.log('Message history built:', messageHistory);

                    console.log('Starting LLM stream...');
                    let stream = await self.llm.stream(messageHistory);
                    let currentTurnIndex = 0;
                    let currentBuffer = '';

                    for await (const chunk of stream) {
                        if (!chunk.content) continue;

                        console.log('Raw:', chunk)
                        // Send raw chunk immediately for frontend display
                        sendChunk('chunk', chunk.content);

                        // Accumulate for JSON parsing
                        currentBuffer += chunk.content;

                        // Try to process complete JSON blocks
                        if (isCompleteJson(currentBuffer)) {
                            const nextIndex = await self.processCompleteJson(
                                currentBuffer,
                                round.response.id,
                                currentTurnIndex,
                                messageHistory
                            );

                            currentTurnIndex = nextIndex;
                            currentBuffer = '';

                            // Get new stream with updated history if needed
                            if (nextIndex > currentTurnIndex) {
                                stream = await self.llm.stream(messageHistory);
                            }
                        }
                    }

                    // Handle any remaining content
                    if (currentBuffer) {
                        await newContentTurn(
                            round.response.id,
                            currentTurnIndex,
                            currentBuffer
                        );
                    }

                } catch (error) {
                    console.error('Stream error in controller:', error);
                    controller.error(error);
                } finally {
                    controller.close();
                }
            }
        });
    }

    private async processCompleteJson(
        jsonContent: string,
        responseId: string,
        currentIndex: number,
        messageHistory: any[]
    ): Promise<number> {
        try {
            const parsed = JSON.parse(jsonContent);

            for (const item of parsed.content) {
                if (item.type === 'text') {
                    await newContentTurn(responseId, currentIndex++, item.text);
                } else if (item.type === 'tool_use') {
                    // Process tool call
                    const mapping = mcpService.getToolServer(item.name);
                    if (!mapping) {
                        throw new Error(`No server found for tool: ${item.name} `);
                    }

                    // Record tool call
                    await newToolCallTurn(
                        responseId,
                        currentIndex++,
                        mapping.server.getId(),
                        item.name,
                        item.input
                    );

                    // Execute and record result 
                    const result = await mapping.server.invokeTool(item.name, item.input);
                    await newToolResultTurn(responseId, currentIndex++, result);

                    // Update message history
                    messageHistory.push(
                        new AIMessage(JSON.stringify(item)),
                        new HumanMessage(JSON.stringify(result))
                    );
                }
            }

            return currentIndex;
        } catch (error) {
            console.error('Error processing JSON content:', error);
            throw error;
        }
    }

    private async loadSystemPrompt(): Promise<string> {
        // TODO: Load system prompt from external source
        throw new Error('System prompt loading not implemented');
    }
}

// Helper function 
function isCompleteJson(text: string): boolean {
    try {
        // Quick initial checks
        text = text.trim();
        if (!text.startsWith('{') || !text.endsWith('}')) {
            return false;
        }

        // Attempt parsing
        JSON.parse(text);
        return true;
    } catch {
        return false;
    }
}
