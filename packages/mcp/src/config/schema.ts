import { z } from 'zod'
import { HealthCheckStrategy } from '../types'
import process from 'node:process'

/**
 * Zod schema for health check configuration
 */
export const healthCheckConfigSchema = z.object({
  strategy: z.nativeEnum(HealthCheckStrategy).default(HealthCheckStrategy.TOOL_LISTING),
  intervalMs: z.number().int().positive().default(30000),
  timeoutMs: z.number().int().positive().default(5000),
  retries: z.number().int().min(0).default(1),
  specificTool: z.object({
    name: z.string(),
    args: z.record(z.any())
  }).optional(),
  customCheck: z.function().args(z.any()).returns(z.promise(z.boolean())).optional()
})

/**
 * Zod schema for server configuration
 */
// Helper to create a clean env object with all keys as string values
function getProcessEnv(): Record<string, string> {
  // For tests, if we're in a test environment, return an empty object
  if (process.env.NODE_ENV === 'test' && process.env.INHERIT_ENV !== 'true') {
    return {};
  }
  
  // Otherwise, return the process environment
  const cleanEnv: Record<string, string> = {};
  Object.keys(process.env).forEach(key => {
    if (process.env[key] !== undefined) {
      cleanEnv[key] = process.env[key] as string;
    }
  });
  return cleanEnv;
}

export const serverConfigSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).default(() => getProcessEnv()), // Default to current process env
  autoApprove: z.array(z.string()).default([]),
  disabled: z.boolean().default(false),
  healthCheck: healthCheckConfigSchema.optional().default({
    strategy: HealthCheckStrategy.TOOL_LISTING,
    intervalMs: 30000,
    timeoutMs: 5000,
    retries: 1
  })
})

// Type inference from schema
export type ValidatedHealthCheckConfig = z.infer<typeof healthCheckConfigSchema>
export type ValidatedServerConfig = z.infer<typeof serverConfigSchema>

/**
 * Default configurations for common scenarios
 */
export const defaultConfigs = {
  /**
   * Minimal config with default values for health and disabled=false
   */
  minimal: serverConfigSchema.parse({
    command: 'echo',
    args: ['Server not configured']
  }),

  /**
   * Development config with more frequent health checks and debug logging
   */
  development: serverConfigSchema.parse({
    command: 'echo',
    args: ['Development server'],
    healthCheck: {
      strategy: HealthCheckStrategy.TOOL_LISTING,
      intervalMs: 15000, // More frequent checks
      timeoutMs: 10000,  // Longer timeout for debugging
      retries: 2         // More retries
    }
  }),

  /**
   * Production config with standard health check settings
   */
  production: serverConfigSchema.parse({
    command: 'echo',
    args: ['Production server'],
    healthCheck: {
      strategy: HealthCheckStrategy.TOOL_LISTING,
      intervalMs: 30000, // Standard interval
      timeoutMs: 5000,   // Short timeout
      retries: 1         // Minimal retries
    }
  }),

  /**
   * Disabled server config
   */
  disabled: serverConfigSchema.parse({
    command: 'echo',
    args: ['Server is disabled'],
    disabled: true
  })
}