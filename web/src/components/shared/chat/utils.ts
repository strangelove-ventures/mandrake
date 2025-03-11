/**
 * Utility functions for chat components
 */
import { Message, SessionHistoryResponse, StreamingTurn } from './types';

/**
 * Add a temporary user message to the message list, avoiding duplicates
 */
export function addUserMessage(messages: Message[], userMessage: Message | null): Message[] {
  if (!userMessage) return messages;
  
  // Check if this message or its content already exists in the history
  const isDuplicate = messages.some(msg => 
    // Either the exact same temp ID
    msg.id === userMessage.id ||
    // Or same content in the last message if it's from the user
    (msg.role === 'user' && 
     msg.content === userMessage.content && 
     messages.indexOf(msg) === messages.length - 1)
  );
  
  if (isDuplicate) {
    console.log('Not adding duplicate user message:', userMessage.content);
    return messages;
  }
  
  return [...messages, userMessage];
}

/**
 * Convert session history data to a flat list of messages
 */
export function messagesFromHistory(historyData: SessionHistoryResponse | undefined): Message[] {
  if (!historyData) return [];
  
  const messages: Message[] = [];
  
  historyData.rounds.forEach(round => {
    // Add user message from request
    messages.push({
      id: round.request.id,
      role: 'user',
      content: round.request.content,
      createdAt: round.request.createdAt
    });
    
    // Add assistant responses from turns
    round.response.turns.forEach(turn => {
      messages.push({
        id: turn.id,
        role: 'assistant',
        content: turn.content,
        createdAt: turn.createdAt
      });
    });
  });
  
  // Sort by timestamp
  return messages.sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

/**
 * Add streaming data to messages list
 */
export function addStreamingData(
  messages: Message[], 
  streamingTurns: StreamingTurn[], 
  isStreaming: boolean
): Message[] {
  if (!isStreaming || streamingTurns.length === 0) return messages;
  
  const result = [...messages];
  const lastStreamingTurn = streamingTurns[streamingTurns.length - 1];
  
  console.log('Adding streaming data, turn:', lastStreamingTurn);
  
  // Add streaming message if it's not already in the history
  const existingMsgIndex = result.findIndex(
    msg => msg.id === lastStreamingTurn.turnId
  );
  
  if (existingMsgIndex === -1) {
    console.log('Adding new streaming message to display');
    result.push({
      id: lastStreamingTurn.turnId,
      role: 'assistant',
      content: lastStreamingTurn.content,
      createdAt: new Date().toISOString()
    });
  } else {
    console.log('Updating existing message with new content');
    // Update existing message with new content
    result[existingMsgIndex].content = lastStreamingTurn.content;
  }
  
  return result;
}

/**
 * Format a timestamp for display
 */
export function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit'
  });
}
