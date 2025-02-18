import type { Message, MessageStream, ProviderConfig } from './types';
import { ProviderError } from './errors';

export abstract class BaseProvider {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.validateConfig(config);
    this.config = config;
  }

  abstract createMessage(
    systemPrompt: string,
    messages: Message[]
  ): MessageStream;

  getModel() {
    return {
      id: this.config.modelId,
      info: this.config.modelInfo
    };
  }

  protected calculateCost(
    inputTokens: number,
    outputTokens: number,
    cacheWriteTokens?: number,
    cacheReadTokens?: number
  ): number {
    const {
      inputPrice = 0,
      outputPrice = 0,
      cacheWritesPrice = 0,
      cacheReadsPrice = 0
    } = this.config.modelInfo;

    const totalCost = (
      (inputPrice / 1_000_000) * inputTokens +
      (outputPrice / 1_000_000) * outputTokens +
      (cacheWriteTokens ? (cacheWritesPrice / 1_000_000) * cacheWriteTokens : 0) +
      (cacheReadTokens ? (cacheReadsPrice / 1_000_000) * cacheReadTokens : 0)
    );
    return Number(totalCost.toFixed(6));
  }

  private validateConfig(config: ProviderConfig) {
    if (!config.modelId) {
      throw new ProviderError('Model ID is required');
    }
    if (!config.modelInfo) {
      throw new ProviderError('Model info is required');
    }
  }
}