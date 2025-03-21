import { z } from 'zod'
import { HealthCheckStrategy } from '../types'
import process from 'node:process'

/**
 * Zod schema for health check configuration
 * 
 * Validates and provides defaults for health check configuration properties.
 * Supports multiple health check strategies including tool listing, ping,
 * specific tool invocation, and custom health checks.
 * 
 * @example
 * // Basic health check with default settings
 * const config = healthCheckConfigSchema.parse({
 *   strategy: HealthCheckStrategy.TOOL_LISTING
 * })
 * 
 * @example
 * // Custom health check with specific tool
 * const config = healthCheckConfigSchema.parse({
 *   strategy: HealthCheckStrategy.SPECIFIC_TOOL,
 *   intervalMs: 15000,
 *   specificTool: {
 *     name: 'ping',
 *     args: { timeout: 2000 }
 *   }
 * })
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
 * Helper to create a clean environment variables object
 * 
 * Handles environment variable inheritance based on the execution context.
 * In test environments, it returns an empty object by default unless 
 * specifically configured to inherit via INHERIT_ENV=true.
 * In non-test environments, it inherits all process environment variables.
 * 
 * @returns A record of string environment variables
 * 
 * @example
 * // In production code
 * const env = getProcessEnv() // Returns all process.env variables
 * 
 * @example
 * // In test code with INHERIT_ENV=true
 * process.env.INHERIT_ENV = 'true'
 * const env = getProcessEnv() // Returns all process.env variables
 * 
 * @example
 * // In test code without INHERIT_ENV set
 * const env = getProcessEnv() // Returns empty object
 */
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

/**
 * Zod schema for MCP server configuration
 * 
 * Validates and provides defaults for server configuration properties including
 * the command to execute, arguments, environment variables, and health check settings.
 * 
 * @example
 * // Minimal valid configuration
 * const config = serverConfigSchema.parse({
 *   command: 'node',
 *   args: ['server.js']
 * })
 * 
 * @example
 * // Full configuration with custom health check
 * const config = serverConfigSchema.parse({
 *   command: 'node',
 *   args: ['server.js', '--port', '3000'],
 *   env: { NODE_ENV: 'production', DEBUG: 'false' },
 *   autoApprove: ['fs.readFile', 'fs.writeFile'],
 *   healthCheck: {
 *     strategy: HealthCheckStrategy.SPECIFIC_TOOL,
 *     intervalMs: 10000,
 *     specificTool: { name: 'status', args: {} }
 *   }
 * })
 */
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

/**
 * TypeScript type for validated health check configuration
 * Inferred from the Zod schema for type safety
 */
export type ValidatedHealthCheckConfig = z.infer<typeof healthCheckConfigSchema>

/**
 * TypeScript type for validated server configuration
 * Inferred from the Zod schema for type safety
 */
export type ValidatedServerConfig = z.infer<typeof serverConfigSchema>

/**
 * Default configurations for common scenarios
 * 
 * Pre-validated configuration objects that can be used as starting points
 * for creating server configurations. These configs provide sensible defaults
 * for different use cases.
 * 
 * @example
 * // Using minimal config as a base
 * const serverConfig = ConfigManager.create({
 *   command: 'node',
 *   args: ['my-server.js'] 
 * }, 'minimal')
 */
export const defaultConfigs = {
  /**
   * Minimal config with default values for health and disabled=false
   * 
   * Provides a baseline configuration with only required fields.
   * Use this as a starting point for simple server configurations.
   */
  minimal: serverConfigSchema.parse({
    command: 'echo',
    args: ['Server not configured']
  })
}