import { describe, test, expect } from 'bun:test';
import { 
  getTokenCounter, 
  CharacterBasedCounter, 
  AnthropicTokenCounter, 
  OpenAITokenCounter,
  LlamaTokenCounter,
  getContextWindowStatus
} from '../src/models/tokenization';
import { type Message } from '../src/common-types';

describe('Token Counters', () => {
  const testText = 'This is a test string to count tokens';
  const sampleMessages: Message[] = [
    { role: 'user', content: 'Hello, how are you today?' },
    { role: 'assistant', content: 'I am doing well, thank you for asking. How can I help you?' },
    { role: 'user', content: 'Can you tell me more about token counting?' }
  ];
  
  test('CharacterBasedCounter counts tokens based on characters', () => {
    const counter = new CharacterBasedCounter();
    
    // Test single string counting
    const strLength = testText.length;
    const expectedTokens = Math.ceil(strLength / 4);
    expect(counter.countTokens(testText)).toBe(expectedTokens);
    
    // Test message counting
    const messageTokens = counter.countMessageTokens(sampleMessages);
    expect(messageTokens).toBeGreaterThan(0);
    
    // Verify content length plus some overhead
    const manualCount = sampleMessages.reduce((sum, msg) => {
      return sum + 1 + Math.ceil((msg.content?.length || 0) / 4);
    }, 0);
    
    expect(messageTokens).toBe(manualCount);
  });
  
  test('AnthropicTokenCounter follows Claude tokenization patterns', () => {
    const counter = new AnthropicTokenCounter();
    
    // Test single string counting - should be different from character-based
    const charCounter = new CharacterBasedCounter();
    expect(counter.countTokens(testText)).not.toBe(charCounter.countTokens(testText));
    
    // Test message counting
    const messageTokens = counter.countMessageTokens(sampleMessages);
    expect(messageTokens).toBeGreaterThan(0);
  });
  
  test('LlamaTokenCounter for LLaMA models', () => {
    const counter = new LlamaTokenCounter();
    
    // Test single string counting
    expect(counter.countTokens(testText)).toBeGreaterThan(0);
    
    // Test message counting
    const messageTokens = counter.countMessageTokens(sampleMessages);
    expect(messageTokens).toBeGreaterThan(0);
    
    // Verify behavior with LLaMA's BOS and EOS tokens
    expect(counter.countMessageTokens(sampleMessages)).toBeGreaterThan(
      counter.countTokens(sampleMessages.map(m => m.content || '').join(''))
    );
  });
  
  test('getTokenCounter returns appropriate counter for provider', () => {
    const anthropicCounter = getTokenCounter('anthropic');
    const openaiCounter = getTokenCounter('openai');
    const llamaCounter = getTokenCounter('ollama');
    const defaultCounter = getTokenCounter('unknown');
    
    expect(anthropicCounter).toBeInstanceOf(AnthropicTokenCounter);
    expect(openaiCounter).toBeInstanceOf(OpenAITokenCounter);
    expect(llamaCounter).toBeInstanceOf(LlamaTokenCounter);
    expect(defaultCounter).toBeInstanceOf(CharacterBasedCounter);
  });
  
  test('getContextWindowStatus returns correct context window details', () => {
    const systemPrompt = 'You are an AI assistant helping users with their questions.';
    const modelContextSize = 2000;
    
    const status = getContextWindowStatus(
      systemPrompt,
      sampleMessages,
      modelContextSize,
      'anthropic',
      'claude-3'
    );
    
    // Assertions
    expect(status.systemTokens).toBeGreaterThan(0);
    expect(status.messageTokens).toBeGreaterThan(0);
    expect(status.totalTokens).toBe(status.systemTokens + status.messageTokens);
    expect(status.fits).toBe(true);
    expect(status.remainingTokens).toBe(modelContextSize - status.totalTokens);
  });
});
