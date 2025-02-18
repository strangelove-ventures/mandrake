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

  calculateCost(
    inputTokens: number,
    outputTokens: number,
  ): number {
    const {
      inputPrice = 0,
      outputPrice = 0,

    } = this.config.modelInfo;

    return Number((
      (inputPrice / 1_000_000) * inputTokens +
      (outputPrice / 1_000_000) * outputTokens
    ).toFixed(6));
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