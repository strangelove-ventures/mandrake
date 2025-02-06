export * from './base';
export * from './anthropic';

import { ProviderConfig } from './base';
import { AnthropicProvider } from './anthropic';

// Factory function
export function createProvider(config: ProviderConfig & { provider: string }) {
  switch (config.provider) {
    case 'anthropic':
      return new AnthropicProvider(config);
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}