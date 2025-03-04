import { z } from 'zod';

// Provider types
export const ProviderType = z.enum(['anthropic', 'ollama', 'xai']);
export type ProviderType = z.infer<typeof ProviderType>;

export const providerConfigSchema = z.object({
    type: ProviderType,
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional(),
});
export type ProviderConfig = z.infer<typeof providerConfigSchema>;

// Model types
export const modelConfigSchema = z.object({
    enabled: z.boolean(),
    providerId: z.string(),
    modelId: z.string(),
    config: z.object({
        temperature: z.number().min(0).max(1).optional(),
        maxTokens: z.number().positive().int().optional(),
    }),
});
export type ModelConfig = z.infer<typeof modelConfigSchema>;

// Overall config
export const modelsConfigSchema = z.object({
    active: z.string(),
    providers: z.record(z.string(), providerConfigSchema),
    models: z.record(z.string(), modelConfigSchema),
});
export type ModelsConfig = z.infer<typeof modelsConfigSchema>;