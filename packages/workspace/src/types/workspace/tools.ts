import { z } from 'zod';

export const volumeSchema = z.object({
  source: z.string(),
  target: z.string(),
  mode: z.enum(['ro', 'rw'])
});

export const serverConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string(),
  command: z.array(z.string()).optional(),
  execCommand: z.array(z.string()).optional(),
  volumes: z.array(volumeSchema).optional()
});

export const toolsConfigSchema = z.array(serverConfigSchema);

export type ServerConfig = z.infer<typeof serverConfigSchema>;
export type ToolsConfig = z.infer<typeof toolsConfigSchema>;