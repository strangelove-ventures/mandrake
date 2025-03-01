import type { TokenCounter, Message } from '@mandrake/utils';

/**
 * Interface for strategies to trim conversation history to fit token limits
 */
export interface TrimStrategy {
  /**
   * Trim messages to fit within a token limit
   * @param messages Array of messages to trim
   * @param maxTokens Maximum number of tokens
   * @param counter Token counter to use
   * @returns Trimmed array of messages that fits within token limit
   */
  trimToFit(messages: Message[], maxTokens: number, counter: TokenCounter): Message[];
}

/**
 * Strategy that preserves the most recent user query and as much history as possible
 * by dropping oldest messages first when necessary.
 */
export class StandardTrimStrategy implements TrimStrategy {
  /**
   * Trims messages to fit within token limit
   * 
   * Strategy:
   * 1. If already under limit, return all messages
   * 2. Always preserve the last user message and any subsequent messages
   * 3. Keep as many earlier messages as possible, dropping from oldest first
   */
  trimToFit(messages: Message[], maxTokens: number, counter: TokenCounter): Message[] {
    // If empty or already under limit, return as is
    if (!messages.length) return [];
    
    const currentTokens = counter.countMessageTokens(messages);
    if (currentTokens <= maxTokens) return [...messages];
    
    // Find the last user message - this must be preserved
    let lastUserMsgIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMsgIndex = i;
        break;
      }
    }
    
    // Handle case where no user messages are found
    if (lastUserMsgIndex === -1) {
      lastUserMsgIndex = Math.max(0, messages.length - 1);
    }
    
    // Always keep the latest user message and any trailing messages
    const preservedMessages = messages.slice(lastUserMsgIndex);
    
    // Calculate tokens used by preserved messages
    const preservedTokens = counter.countMessageTokens(preservedMessages);
    
    // If just these essential messages exceed the limit, return just the last few messages
    if (preservedTokens > maxTokens) {
      // Try to keep at least the last message
      const lastMessage = messages[messages.length - 1];
      const lastMessageTokens = counter.countMessageTokens([lastMessage]);
      
      if (lastMessageTokens <= maxTokens) {
        return [lastMessage];
      }
      
      // If even the last message is too big, we can't do anything
      // In practice, we should handle this elsewhere or truncate the message
      return [];
    }
    
    // Calculate how many tokens we can use for earlier context
    const remainingTokens = maxTokens - preservedTokens;
    
    // Add as many earlier messages as will fit, starting from right before lastUserMsgIndex
    const earlierMessages = [];
    let tokensUsed = 0;
    
    for (let i = lastUserMsgIndex - 1; i >= 0; i--) {
      const messageTokens = counter.countMessageTokens([messages[i]]);
      if (tokensUsed + messageTokens <= remainingTokens) {
        // Add message to the front of the array
        earlierMessages.unshift(messages[i]);
        tokensUsed += messageTokens;
      } else {
        // Stop once we can't fit any more messages
        break;
      }
    }
    
    // Combine earlier context with preserved messages
    return [...earlierMessages, ...preservedMessages];
  }
}
