import { createProvider, type BaseProvider } from '@mandrake/provider';
import type { ModelsManager } from '@mandrake/workspace';
import type { ProviderType } from '@mandrake/utils';
import { ProviderError } from '../errors';
import { getModelInfo } from '@mandrake/utils';

export async function setupProviderFromManager(modelsManager: ModelsManager): Promise<BaseProvider> {
    // Get active model
    const activeModelId = await modelsManager.getActive();
    if (!activeModelId) {
        throw new ProviderError('No active model found');
    }

    // Get model config  
    const modelConfig = await modelsManager.getModel(activeModelId);
    if (!modelConfig.enabled) {
        throw new ProviderError('Active model is disabled');
    }

    // Get provider config
    const providerConfig = await modelsManager.getProvider(modelConfig.providerId);
    
    // Get model info from utils for accurate max tokens
    const modelInfo = getModelInfo(providerConfig.type as ProviderType, modelConfig.modelId);
    
    // Use model info max tokens if available, otherwise fall back to config
    const maxTokens = modelInfo?.maxTokens || modelConfig.config.maxTokens;

    return createProvider(
        providerConfig.type as ProviderType,
        {
            apiKey: providerConfig.apiKey,
            baseUrl: providerConfig.baseUrl,
            modelId: modelConfig.modelId // This is the actual model ID to use with the provider
        }
    );
}