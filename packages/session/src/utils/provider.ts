import { createProvider, type BaseProvider } from '@mandrake/provider';
import type { ModelsManager } from '@mandrake/workspace';
import type { ProviderType } from '@mandrake/utils';
import { ProviderError } from '../errors';

export async function setupProviderFromManager(modelsManager: ModelsManager): Promise<BaseProvider> {
    // Get active model
    const modelId = await modelsManager.getActive();
    if (!modelId) {
        throw new ProviderError('No active model found');
    }

    // Get model config  
    const modelConfig = await modelsManager.getModel(modelId);
    if (!modelConfig.enabled) {
        throw new ProviderError('Active model is disabled');
    }

    // Get provider config
    const providerConfig = await modelsManager.getProvider(modelConfig.providerId);

    return createProvider(
        providerConfig.type as ProviderType,
        {
            apiKey: providerConfig.apiKey,
            baseUrl: providerConfig.baseUrl,
            modelId: modelConfig.modelId
        }
    );
}