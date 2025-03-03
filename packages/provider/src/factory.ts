import type { ProviderType } from '@mandrake/utils';
import { getModelInfo, createLogger } from '@mandrake/utils';
import { BaseProvider } from './base';
import type { ProviderConfig } from './types';
import { ProviderError } from './errors';
import { AnthropicProvider } from './providers/anthropic';
import { OllamaProvider } from './providers/ollama';
import { XAIProvider } from './providers/xai';

const logger = createLogger('provider:factory');

export function createProvider(
  type: ProviderType,
  config: Omit<ProviderConfig, 'modelInfo'>
): BaseProvider {
  logger.debug('Creating provider', { type, modelId: config.modelId });
  
  const modelInfo = getModelInfo(type, config.modelId);
  if (!modelInfo) {
    logger.error('Unknown model', { type, modelId: config.modelId });
    throw new ProviderError(`Unknown model ${config.modelId} for provider ${type}`);
  }

  const fullConfig = { ...config, modelInfo };

  let provider: BaseProvider;
  
  switch (type) {
    case 'anthropic':
      logger.debug('Creating Anthropic provider');
      provider = new AnthropicProvider(fullConfig);
      break;
    case 'ollama':
      logger.debug('Creating Ollama provider');
      provider = new OllamaProvider(fullConfig);
      break;
    case 'xai':
      logger.debug('Creating XAI provider');
      provider = new XAIProvider(fullConfig);
      break;
    default:
      logger.error('Provider type not implemented', { type });
      throw new ProviderError(`Provider type not implemented: ${type}`);
  }
  
  logger.info('Provider created successfully', { 
    type, 
    modelId: config.modelId,
    maxTokens: modelInfo.maxTokens 
  });
  
  return provider;
}