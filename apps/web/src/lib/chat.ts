// apps/web/src/lib/chat.ts
import { mcpService } from './mcp';
import { formatToolsOpenAI } from '@mandrake/mcp';
import { Tool } from '@mandrake/types';
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { prisma } from '@mandrake/storage';


export type StreamMessage = {
  type: 'init' | 'chunk' | 'tool_call' | 'done';
  content?: string;
  conversationId?: string;
  userMessage?: any;
  aiMessage?: any;
};

export async function handleToolCall(
  toolCall: any,
  chatModel: ChatOpenAI,
  messageHistory: any[],
  message: string
): Promise<AsyncGenerator<any>> {
  if (!mcpService) {
    throw new Error('MCP Service not initialized');
  }
  const mapping = mcpService.getToolServer(toolCall.name);
  if (!mapping) throw new Error(`No server found for tool: ${toolCall.name}`);

  const result = await mapping.server.invokeTool(toolCall.name, toolCall.input);

  return chatModel.stream([
    ...messageHistory,
    new HumanMessage(message),
    new AIMessage(JSON.stringify({ content: [toolCall] })),
    new HumanMessage(JSON.stringify(result))
  ]);
}

const encoder = new TextEncoder();

export function sendStreamMessage(controller: ReadableStreamDefaultController, message: StreamMessage) {
    controller.enqueue(encoder.encode(JSON.stringify(message) + '\n'));
}

export function buildSystemPrompt(tools: Tool[]) {
    const toolSchemas = formatToolsOpenAI(tools);

    return `In this environment you have access to several tools that can help you fulfill user requests.

When you need to use a tool, you must return a single JSON object with EXACTLY this format:

{
  "content": [
    {
      "type": "text",
      "text": "I'm going to use the write_file tool to create a new file.\\nThe file will contain some example content.\\nLet me do that for you now."
    },
    {
      "type": "tool_use",
      "name": "write_file",
      "input": {
        "path": "example.txt",
        "content": "Hello\\nWorld"
      }
    }
  ]
}

Important format notes:
- Line breaks in text and content must use "\\n" not actual line breaks
- The entire response must be a single valid JSON object
- Always include both explanatory text and the tool use
- Strings must use double quotes, not single quotes

After receiving the tool's response, continue by:
1. Acknowledging the tool's response
2. Explaining what happened
3. Using another tool if needed, or completing the task

Available tools:
${JSON.stringify(toolSchemas, null, 2)}

Remember:
- Never use markdown code blocks or language tags around the JSON
- Each tool call must be preceded by explanatory text
- Wait for each tool's response before proceeding`;
}

export async function buildMessageHistory(conversationId?: string, message?: string) {
    try {
        console.log('Starting buildMessageHistory');
        console.log('Waiting for MCP initialization...');
        await mcpInitialized;
        console.log('MCP initialized');

        // Get tools from MCP with error handling
        const servers = Array.from(mcpService.getServers().values());
        console.log(`Found ${servers.length} MCP servers`);

        const tools = await Promise.all(
            servers.map(async server => {
                try {
                    return await server.listTools();
                } catch (e) {
                    console.error(`Failed to list tools for server: ${e}`);
                    return [];
                }
            })
        ).then(serverTools => serverTools.flat());
        console.log(`Found ${tools.length} total tools`);

        // Build system prompt
        const systemPrompt = buildSystemPrompt(tools);

        // Find or create conversation
        const conversation = conversationId
            ? await prisma.conversation.findUnique({
                where: { id: conversationId },
                include: {
                    messages: {
                        orderBy: {
                            createdAt: 'asc'
                        }
                    }
                }
            })
            : message
                ? await prisma.conversation.create({
                    data: {
                        title: message.slice(0, 50),
                        workspaceId: '06d07df4-299d-43f2-b4c3-9b66ae8ccd63' // Use default workspace ID
                    },
                    include: { messages: true }
                })
                : null;

        if (!conversation) {
            throw new Error('Conversation not found or could not be created');
        }

        console.log(`Using conversation ${conversation.id} with ${conversation.messages.length} messages`);

        // Format messages for LangChain
        const messages = [
            new SystemMessage(systemPrompt),
            ...conversation.messages.map(msg =>
                msg.role === 'user'
                    ? new HumanMessage(msg.content)
                    : new AIMessage(msg.content)
            )
        ];

        console.log(`Returning ${messages.length} formatted messages`);
        return messages;

    } catch (e) {
        console.error('Error in buildMessageHistory:', e);
        // Provide a fallback for basic functionality
        return [
            new SystemMessage("I am an AI assistant. I apologize, but I'm currently unable to access my tools.")
        ];
    }
}