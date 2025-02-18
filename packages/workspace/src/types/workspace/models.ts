import { z } from 'zod';
import { ProviderType } from '@mandrake/utils';

// Update provider types to match utils


const providerConfigSchema = z.object({
  type: ProviderType,
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
});

// Model config needs maxTokens since provider needs it
const modelConfigSchema = z.object({
  enabled: z.boolean(),
  providerId: z.string(),
  modelId: z.string(),
  config: z.object({
    temperature: z.number().min(0).max(1).optional(),
    maxTokens: z.number().positive().int(), // Required now
  }),
});

// Re-export types
export type { ProviderType } from '@mandrake/utils';