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
 * Convert session history data to a flat list of messages, preserving response structure
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
    
    // Process all turns in the response to include response ID
    if (round.response.turns.length > 0) {
      round.response.turns.forEach(turn => {
        messages.push({
          id: turn.id,
          role: 'assistant',
          content: turn.content,
          createdAt: turn.createdAt,
          responseId: round.response.id,
          index: turn.index,
          rawResponse: turn.rawResponse,
          toolCalls: turn.toolCalls,
          status: turn.status
        });
      });
    }
  });
  
  // Sort by timestamp
  return messages.sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

/**
 * Add streaming data to messages list, preserving response structure
 */
export function addStreamingData(
  messages: Message[], 
  streamingTurns: StreamingTurn[], 
  isStreaming: boolean
): Message[] {
  if (!isStreaming || streamingTurns.length === 0) return messages;
  
  const result = [...messages];
  
  // Group streaming turns by responseId
  const turnsByResponse: Record<string, StreamingTurn[]> = {};
  
  streamingTurns.forEach(turn => {
    const responseId = turn.responseId || `temp-response-${Date.now()}`;
    if (!turnsByResponse[responseId]) {
      turnsByResponse[responseId] = [];
    }
    turnsByResponse[responseId].push(turn);
  });
  
  // Process each response group
  Object.entries(turnsByResponse).forEach(([responseId, turns]) => {
    // Check if we already have messages for this response
    const existingTurns = result.filter(
      msg => msg.role === 'assistant' && 'responseId' in msg && msg.responseId === responseId
    );
    
    if (existingTurns.length === 0) {
      // No existing turns for this response, add all streaming turns as new messages
      turns.forEach(turn => {
        result.push({
          id: turn.turnId,
          role: 'assistant',
          content: turn.content,
          createdAt: new Date().toISOString(),
          responseId: responseId,
          index: turn.index,
          rawResponse: turn.rawResponse,
          toolCalls: turn.toolCalls,
          status: turn.status
        });
      });
    } else {
      // Update existing turns with streaming content
      turns.forEach(streamingTurn => {
        const existingIndex = result.findIndex(
          msg => msg.role === 'assistant' && 
                 'id' in msg && 
                 msg.id === streamingTurn.turnId
        );
        
        if (existingIndex !== -1) {
          // Update existing message
          result[existingIndex].content = streamingTurn.content;
          if (streamingTurn.rawResponse) {
            result[existingIndex].rawResponse = streamingTurn.rawResponse;
          }
          if (streamingTurn.toolCalls) {
            result[existingIndex].toolCalls = streamingTurn.toolCalls;
          }
          if (streamingTurn.status) {
            result[existingIndex].status = streamingTurn.status;
          }
        } else {
          // Add as a new turn for this response
          result.push({
            id: streamingTurn.turnId,
            role: 'assistant',
            content: streamingTurn.content,
            createdAt: new Date().toISOString(),
            responseId: responseId,
            index: streamingTurn.index,
            rawResponse: streamingTurn.rawResponse,
            toolCalls: streamingTurn.toolCalls,
            status: streamingTurn.status
          });
        }
      });
    }
  });
  
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
