import { describe, test, expect } from 'bun:test';
import { StandardTrimStrategy } from '../../src/utils/trim';
import { CharacterBasedCounter, type Message } from '@mandrake/utils';

describe('Trim strategies', () => {
  // Create a repeatable test message array
  const createMessages = (count: number): Message[] => {
    const messages: Message[] = [];
    for (let i = 0; i < count; i++) {
      messages.push({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `This is message ${i} with some additional text to increase token count.`
      });
    }
    return messages;
  };
  
  // Pretend we have a 300 token limit for most tests
  const MAX_TOKENS = 300;
  const tokenCounter = new CharacterBasedCounter();
  
  test('StandardTrimStrategy preserves the most recent user message', () => {
    // Create messages with last one being assistant
    const messages = createMessages(40); // Make this larger to ensure it exceeds the token limit
    messages.push({
      role: 'assistant',
      content: 'This is the final assistant response'
    });
    
    const strategy = new StandardTrimStrategy();
    
    const trimmed = strategy.trimToFit(messages, MAX_TOKENS, tokenCounter);
    
    // Trimmed should be shorter than original
    expect(trimmed.length).toBeLessThan(messages.length);
    
    // Find the last user message in original array
    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
    
    // This user message should be in the trimmed result
    const lastUserMsg = messages[lastUserIndex];
    expect(trimmed.some(m => 
      m.role === lastUserMsg.role && 
      m.content === lastUserMsg.content
    )).toBe(true);
    
    // All messages after the last user should be preserved
    const messagesAfterLastUser = messages.slice(lastUserIndex);
    for (const msg of messagesAfterLastUser) {
      expect(trimmed.some(m => 
        m.role === msg.role && 
        m.content === msg.content
      )).toBe(true);
    }
    
    // Token count should be under limit
    expect(tokenCounter.countMessageTokens(trimmed)).toBeLessThanOrEqual(MAX_TOKENS);
  });
  
  test('No trimming happens if messages already under limit', () => {
    const messages = createMessages(3); // Small number of messages
    const strategy = new StandardTrimStrategy();
    
    const trimmed = strategy.trimToFit(messages, MAX_TOKENS, tokenCounter);
    
    // All messages should be included
    expect(trimmed.length).toBe(messages.length);
    
    // Messages should be identical
    for (let i = 0; i < messages.length; i++) {
      expect(trimmed[i]).toEqual(messages[i]);
    }
  });
  
  test('Extreme case: if limit is too small, only keep essential messages', () => {
    const messages = createMessages(20);
    const strategy = new StandardTrimStrategy();
    
    // Set a very small token limit
    const tinyLimit = 20;
    
    const trimmed = strategy.trimToFit(messages, tinyLimit, tokenCounter);
    
    // Should have at most one message
    expect(trimmed.length).toBeLessThanOrEqual(1);
    
    // Token count should be under limit
    if (trimmed.length > 0) {
      expect(tokenCounter.countMessageTokens(trimmed)).toBeLessThanOrEqual(tinyLimit);
    }
  });
  
  test('With no user messages, preserves the most recent messages', () => {
    // Create messages with all assistant messages
    const messages: Message[] = [];
    for (let i = 0; i < 10; i++) {
      messages.push({
        role: 'assistant',
        content: `This is assistant message ${i}`
      });
    }
    
    const strategy = new StandardTrimStrategy();
    
    const trimmed = strategy.trimToFit(messages, MAX_TOKENS, tokenCounter);
    
    // Last message should be preserved
    expect(trimmed[trimmed.length - 1]).toEqual(messages[messages.length - 1]);
    
    // Token count should be under limit
    expect(tokenCounter.countMessageTokens(trimmed)).toBeLessThanOrEqual(MAX_TOKENS);
  });
});
