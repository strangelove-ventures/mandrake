import { describe, test, expect, beforeAll } from "bun:test";
import { 
  OllamaProvider,
  NetworkError,
  type TextChunk,
  type MessageStreamChunk 
} from "../../src";

const MODEL = 'llama3.2:3b';

describe('OllamaProvider', () => {
  let provider: OllamaProvider;

  beforeAll(() => {
    provider = new OllamaProvider({
      modelId: MODEL,
      modelInfo: {
        maxTokens: 4096,
        contextWindow: 4096
      }
    });
  });

  test('streams responses with usage info', async () => {
    const stream = await provider.createMessage(
      'You are a helpful assistant',
      [{
        role: 'user',
        content: 'Write a haiku about programming.'
      }]
    );

    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    // Should have usage chunks
    const usageChunks = chunks.filter(c => c.type === 'usage');
    expect(usageChunks.length).toBeGreaterThan(0);
    
    // We should have final usage info
    const finalUsage = usageChunks[usageChunks.length - 1];
    expect(finalUsage.type).toBe('usage');
    expect(finalUsage.inputTokens).toBeGreaterThan(0);

    // Should have text chunks
    const textChunks = chunks.filter(c => c.type === 'text');
    expect(textChunks.length).toBeGreaterThan(0);

    // Combined text should form valid haiku
    const fullText = textChunks
      .map(c => (c as TextChunk).text)
      .join('');
    expect(fullText).toContain('\n');
  });

  test('handles multiple messages', async () => {
    const stream = await provider.createMessage(
      'You are a helpful assistant',
      [
        { role: 'user', content: 'What is 2+2?' },
        { role: 'assistant', content: '4' },
        { role: 'user', content: 'Now multiply that by 3' }
      ]
    );

    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    // Should contain "12" in response
    const fullText = chunks
      .filter(c => c.type === 'text')
      .map(c => (c as TextChunk).text)
      .join('');
    
    expect(fullText.toLowerCase()).toContain('12');
  });

  test('respects maxTokens from config', async () => {
    const limitedProvider = new OllamaProvider({
      modelId: MODEL,
      modelInfo: {
        maxTokens: 10,
        contextWindow: 4096
      }
    });

    const stream = await limitedProvider.createMessage(
      'You are a helpful assistant',
      [{ 
        role: 'user', 
        content: 'Write a very long story about a dog that goes on an adventure.'
      }]
    );

    let responseLength = 0;
    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        responseLength += chunk.text.length;
      }
    }

    // Response should be truncated due to maxTokens
    expect(responseLength).toBeLessThan(100);
  });
});