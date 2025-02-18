import { describe, test, expect } from "bun:test";
import { BaseProvider, ProviderError } from "../../src";
import type { Message, MessageStream } from "../../src";

class TestProvider extends BaseProvider {
  createMessage(systemPrompt: string, messages: Message[]): MessageStream {
    throw new Error("Method not implemented.");
  }
}

describe('BaseProvider', () => {
  describe('constructor', () => {
    test('validates required config fields', () => {
      expect(() => new TestProvider({} as any))
        .toThrow('Model ID is required');

      expect(() => new TestProvider({ modelId: 'test' } as any))
        .toThrow('Model info is required');
    });

    test('accepts valid config', () => {
      const provider = new TestProvider({
        modelId: 'test',
        modelInfo: {
          maxTokens: 1000
        }
      });

      expect(provider).toBeInstanceOf(BaseProvider);
    });
  });

  describe('getModel', () => {
    test('returns model info', () => {
      const provider = new TestProvider({
        modelId: 'test',
        modelInfo: {
          maxTokens: 1000,
          inputPrice: 10
        }
      });

      expect(provider.getModel()).toEqual({
        id: 'test',
        info: {
          maxTokens: 1000,
          inputPrice: 10
        }
      });
    });
  });

  describe('calculateCost', () => {
    test('calculates basic input/output costs', () => {
      const provider = new TestProvider({
        modelId: 'test',
        modelInfo: {
          maxTokens: 1000,
          inputPrice: 15,
          outputPrice: 75
        }
      });

      const cost = (provider as any).calculateCost(100, 200);
      expect(cost).toBe((15 * 100 + 75 * 200) / 1_000_000);
    });

    test('handles missing prices', () => {
      const provider = new TestProvider({
        modelId: 'test',
        modelInfo: {
          maxTokens: 1000
        }
      });

      const cost = (provider as any).calculateCost(100, 200);
      expect(cost).toBe(0);
    });

    test('includes cache costs when provided', () => {
      const provider = new TestProvider({
        modelId: 'test',
        modelInfo: {
          maxTokens: 1000,
          inputPrice: 15,
          outputPrice: 75,
          cacheWritesPrice: 5,
          cacheReadsPrice: 2
        }
      });

      const cost = (provider as any).calculateCost(100, 200, 50, 25);
      expect(cost).toBeCloseTo(0.0168, 6);
    });
  });
});