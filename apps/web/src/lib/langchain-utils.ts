import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";

// Initialize the chat model
export const initializeChatModel = () => {
  return new ChatGoogleGenerativeAI({
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY!,
    modelName: "gemini-pro",
    maxOutputTokens: 2048,
    streaming: true,
  });
};

// Convert chat history to LangChain format
export const formatChatHistory = (messages: Array<{ role: string; content: string }>) => {
  return messages.map((message) => {
    switch (message.role) {
      case 'user':
        return new HumanMessage(message.content);
      case 'assistant':
        return new AIMessage(message.content);
      case 'system':
        return new SystemMessage(message.content);
      default:
        throw new Error(`Unknown message role: ${message.role}`);
    }
  });
};

// Send a message to the chat model with streaming
export const sendMessage = async (
  chatModel: ChatGoogleGenerativeAI,
  messages: Array<{ role: string; content: string }>,
  onToken: (token: string) => void
) => {
  const formattedHistory = formatChatHistory(messages);
  let fullResponse = '';
  
  const stream = await chatModel.stream(formattedHistory);
  
  for await (const chunk of stream) {
    const token = chunk.content;
    fullResponse += token;
    onToken(token);
  }
  
  return fullResponse;
};