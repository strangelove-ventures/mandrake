import { describe, test, expect, beforeAll } from "bun:test";
import { 
  XAIProvider,
  NetworkError,
  type TextChunk,
  type MessageStreamChunk,
  type MessageStream
} from "../../src";

await import('dotenv').then(dotenv => dotenv.config());

const MODEL = 'grok-beta';

const collectStreamWithTimeout = async (stream: MessageStream, timeoutMs = 30000) => {
  const chunks: MessageStreamChunk[] = [];
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Stream timeout')), timeoutMs));
  
  try {
    await Promise.race([
      (async () => {
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
      })(),
      timeoutPromise
    ]);
    return chunks;
  } catch (err) {
    throw err;
  }
};

const testStreamError = async (streamGenerator: MessageStream) => {
  const iterator = streamGenerator[Symbol.asyncIterator]();
  await iterator.next();
};

describe('XAIProvider', () => {
  let provider: XAIProvider;

  beforeAll(() => {
    // Ensure API key is available
    if (!process.env.XAI_API_KEY) {
      throw new Error('XAI_API_KEY must be set in environment for integration tests');
    }

    provider = new XAIProvider({
      modelId: MODEL,
      apiKey: process.env.XAI_API_KEY,
      modelInfo: {
        maxTokens: 4096,
        contextWindow: 130000,
        inputPrice: 5,
        outputPrice: 25
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

    const chunks = await collectStreamWithTimeout(stream);

    // Should have usage chunks
    const usageChunks = chunks.filter(c => c.type === 'usage');
    expect(usageChunks.length).toBeGreaterThan(0);
    
    // Should have text chunks
    const textChunks = chunks.filter(c => c.type === 'text');
    expect(textChunks.length).toBeGreaterThan(0);

    // Combined text should form valid haiku
    const fullText = textChunks
      .map(c => (c as TextChunk).text)
      .join('');
    expect(fullText).toContain('\n');
  });

  test('handles API errors', async () => {
    const badProvider = new XAIProvider({
      modelId: MODEL,
      apiKey: 'bad-key',
      modelInfo: {
        maxTokens: 4096,
        contextWindow: 130000
      }
    });

    const stream = badProvider.createMessage(
      'You are a helpful assistant',
      [{ role: 'user', content: 'Hello' }]
    );

    await expect(testStreamError(stream)).rejects.toThrow(NetworkError);
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

    const chunks = await collectStreamWithTimeout(stream);

    // Should contain "12" in response
    const fullText = chunks
      .filter(c => c.type === 'text')
      .map(c => (c as TextChunk).text)
      .join('');
    
    expect(fullText.toLowerCase()).toContain('12');
  });

  test('respects maxTokens from config', async () => {
    const limitedProvider = new XAIProvider({
      modelId: MODEL,
      apiKey: process.env.XAI_API_KEY,
      modelInfo: {
        maxTokens: 10,
        contextWindow: 130000
      }
    });

    const stream = await limitedProvider.createMessage(
      'You are a helpful assistant',
      [{ 
        role: 'user', 
        content: 'Write a very long story about a dog that goes on an adventure.'
      }]
    );

    const chunks = await collectStreamWithTimeout(stream);
    const responseLength = chunks
      .filter(c => c.type === 'text')
      .reduce((len, c) => len + (c as TextChunk).text.length, 0);

    // Response should be truncated due to maxTokens
    expect(responseLength).toBeLessThan(100);
  });
});