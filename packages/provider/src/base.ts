import type { Message, MessageStream, ProviderConfig } from './types';
import { ProviderError } from './errors';
import { createLogger, type Logger, type LogMeta } from '@mandrake/utils';

export abstract class BaseProvider {
  protected config: ProviderConfig;
  protected logger: Logger;

  constructor(config: ProviderConfig) {
    this.validateConfig(config);
    this.config = config;
    this.logger = createLogger('provider', {
      meta: {
        provider: this.constructor.name,
        modelId: config.modelId
      }
    });
    this.logger.debug('Provider initialized', { baseUrl: config.baseUrl });
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

    const cost = Number((
      (inputPrice / 1_000_000) * inputTokens +
      (outputPrice / 1_000_000) * outputTokens
    ).toFixed(6));
    
    this.logger.debug('Cost calculated', {
      inputTokens,
      outputTokens,
      inputPrice,
      outputPrice,
      cost
    });

    return cost;
  }
  private validateConfig(config: ProviderConfig) {
    if (!config.modelId) {
      this.logger.error('Invalid config', { error: 'Model ID is required' });
      throw new ProviderError('Model ID is required');
    }
    if (!config.modelInfo) {
      this.logger.error('Invalid config', { error: 'Model info is required' });
      throw new ProviderError('Model info is required');
    }
  }
}