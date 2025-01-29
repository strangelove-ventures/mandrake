import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import {
    getSessionMessages,
    newRoundForSession,
    newToolCallTurn,
    newToolResultTurn,
    newContentTurn,
    getOrCreateSession
} from '@mandrake/storage';
import { createProvider } from '@mandrake/langchain/src/providers';
import { buildSystemPrompt } from './system-prompt';
import { mcpService } from './mcp';

// Configure the active provider
const ACTIVE_PROVIDER = process.env.ACTIVE_PROVIDER || "anthropic";
const PROVIDER_CONFIG = {
    apiKey: process.env.ANTHROPIC_API_KEY || process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.PROVIDER_BASE_URL,
    maxTokens: 4096,
    temperature: 0.7
};

export class ToolChat {
    private llm: any;
    private jsonBuffer: string = '';

    constructor() {
        this.llm = createProvider(ACTIVE_PROVIDER as any, PROVIDER_CONFIG);
    }

    private async buildMessageHistory(message: string, sessionId?: string) {
        // Get history if session exists but don't add current message
        const messages = sessionId
            ? await getSessionMessages(sessionId)
            : [];

        // Load system prompt externally and convert to LangChain format
        const systemMessage = await this.loadSystemPrompt();

        // Convert valid historical messages to LangChain format
        const validMessages = messages
            .filter(msg => msg.content && msg.content.trim() !== '')
            .map(msg =>
                msg.role === 'user'
                    ? new HumanMessage(msg.content)
                    : new AIMessage(msg.content)
            );

        // Build final message array with system prompt and only the new message
        const messageHistory = [
            new SystemMessage(systemMessage),
            ...validMessages,
            new HumanMessage(message)  // Only add the new message once
        ];

        return messageHistory;
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
                        encoder.encode(JSON.stringify({ type, content }) + '\n')
                    );
                };

                // Set timeout for stream
                const streamTimeout = setTimeout(() => {
                    console.error('LLM stream timeout after 30s');
                    controller.error(new Error('Stream timeout'));
                    controller.close();
                }, 30000);

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

                        console.log('Raw chunk:', chunk)
                        // Just send the text content for streaming display
                        sendChunk('text', chunk.content);

                        // Accumulate for JSON parsing
                        currentBuffer += chunk.content;

                        // Process complete JSON for tool calls
                        if (isCompleteJson(currentBuffer)) {
                            const nextIndex = await self.processCompleteJson(
                                currentBuffer,
                                round.response.id,
                                currentTurnIndex,
                                messageHistory
                            );
                            currentTurnIndex = nextIndex;
                            currentBuffer = '';
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

                    clearTimeout(streamTimeout);
                } catch (error) {
                    console.error('Stream error in controller:', error);
                    controller.error(error);
                } finally {
                    clearTimeout(streamTimeout);
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
                        throw new Error(`No server found for tool: ${item.name}`);
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
        const tools = await mcpService.getTools()
        return buildSystemPrompt(tools);
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
