import type { ProviderType } from '@mandrake/utils';
import { getModelInfo } from '@mandrake/utils';
import { BaseProvider } from './base';
import type { ProviderConfig } from './types';
import { ProviderError } from './errors';
import { AnthropicProvider } from './providers/anthropic';
import { OllamaProvider } from './providers/ollama';

export function createProvider(
  type: ProviderType,
  config: Omit<ProviderConfig, 'modelInfo'>
): BaseProvider {
  const modelInfo = getModelInfo(type, config.modelId);
  if (!modelInfo) {
    throw new ProviderError(`Unknown model ${config.modelId} for provider ${type}`);
  }

  const fullConfig = { ...config, modelInfo };

  switch (type) {
    case 'anthropic':
      return new AnthropicProvider(fullConfig);
    case 'ollama':
      return new OllamaProvider(fullConfig);
    default:
      throw new ProviderError(`Provider type not implemented: ${type}`);
  }
}