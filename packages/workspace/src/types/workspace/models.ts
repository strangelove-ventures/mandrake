import { z } from 'zod';

const providerTypeSchema = z.enum([
  'anthropic',
  'ollama',
  'openai',
  'grok',
  'deepseek',
  'openrouter',
]);

const providerConfigSchema = z.object({
  type: providerTypeSchema,
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
});

const modelConfigSchema = z.object({
  enabled: z.boolean(),
  providerId: z.string(),
  modelId: z.string(),
  config: z.object({
    temperature: z.number().min(0).max(1).optional(),
    maxTokens: z.number().positive().int().optional(),
  }),
});

export const modelsConfigSchema = z.object({
  active: z.string(),
  providers: z.record(z.string(), providerConfigSchema),
  models: z.record(z.string(), modelConfigSchema),
});

export type ProviderType = z.infer<typeof providerTypeSchema>;
export type ProviderConfig = z.infer<typeof providerConfigSchema>;
export type ModelConfig = z.infer<typeof modelConfigSchema>;
export type ModelsConfig = z.infer<typeof modelsConfigSchema>;
