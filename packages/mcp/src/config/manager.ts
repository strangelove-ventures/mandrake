import { createLogger } from '@mandrake/utils'
import { serverConfigSchema, defaultConfigs } from './schema'
import type { ValidatedServerConfig } from './schema'

// Logger for the config module
const logger = createLogger('mcp').child({
  meta: { component: 'config' }
})

/**
 * Configuration manager for MCP servers
 * 
 * Provides static methods for validating, creating, and updating MCP server configurations.
 * All methods perform validation against the schema and apply default values as needed.
 * 
 * @example
 * // Validate a server configuration
 * const config = ConfigManager.validate({
 *   command: 'node',
 *   args: ['server.js']
 * })
 * 
 * @example
 * // Create a new configuration based on a default config
 * const config = ConfigManager.create({
 *   command: 'node',
 *   args: ['server.js']
 * }, 'development')
 * 
 * @example
 * // Update an existing configuration
 * const updatedConfig = ConfigManager.update(existingConfig, {
 *   args: ['server.js', '--port', '4000'],
 *   disabled: false
 * })
 */
export class ConfigManager {
  /**
   * Validate a server configuration against the schema
   * 
   * Takes a configuration object, validates it against the server configuration schema,
   * and applies all default values for missing properties.
   * 
   * @param config The configuration to validate
   * @returns A validated configuration with all defaults applied
   * @throws {Error} If validation fails (e.g., missing required fields or invalid types)
   * 
   * @example
   * // Validate a minimal configuration
   * const validConfig = ConfigManager.validate({
   *   command: 'node',
   *   args: ['server.js']
   * })
   * 
   * @example
   * // Will throw an error (missing required 'command' field)
   * try {
   *   ConfigManager.validate({ args: ['server.js'] })
   * } catch (error) {
   *   console.error('Validation failed:', error.message)
   * }
   */
  static validate(config: any): ValidatedServerConfig {
    try {
      return serverConfigSchema.parse(config)
    } catch (error) {
      logger.error('Server configuration validation failed', { error })
      throw error
    }
  }

  /**
   * Create a configuration by merging with defaults
   * 
   * Creates a new configuration by merging a partial configuration with a base configuration.
   * The base can be either the predefined 'minimal' default config or
   * an existing validated configuration object.
   * 
   * @param config Partial configuration with properties to override
   * @param baseConfig Base configuration (defaults to 'minimal') - can be 'minimal' or a ValidatedServerConfig
   * @returns A validated merged configuration with all defaults applied
   * @throws {Error} If validation of the merged configuration fails
   * 
   * @example
   * // Create config based on 'minimal' default (default base)
   * const config = ConfigManager.create({
   *   command: 'node', 
   *   args: ['server.js']
   * })
   * 
   * @example
   * // Create config based on existing validated config
   * const newConfig = ConfigManager.create({
   *   disabled: false
   * }, existingValidatedConfig)
   */
  static create(
    config: Partial<ValidatedServerConfig>,
    baseConfig: 'minimal' | ValidatedServerConfig = 'minimal'
  ): ValidatedServerConfig {
    const base = typeof baseConfig === 'string'
      ? defaultConfigs[baseConfig]
      : baseConfig

    // Deep merge the configs
    const merged = ConfigManager.deepMerge(base, config)
    
    // Validate the merged config
    return ConfigManager.validate(merged)
  }

  /**
   * Update an existing configuration
   * 
   * Updates an existing validated configuration with new values.
   * This performs a deep merge of the updates into the existing configuration
   * and re-validates the result.
   * 
   * @param existing The existing validated configuration
   * @param updates Partial updates to apply to the configuration
   * @returns A new validated configuration with updates applied
   * @throws {Error} If validation of the updated configuration fails
   * 
   * @example
   * // Update the arguments and health check timeout
   * const updatedConfig = ConfigManager.update(existingConfig, {
   *   args: ['server.js', '--port', '5000'],
   *   healthCheck: {
   *     timeoutMs: 10000
   *   }
   * })
   */
  static update(
    existing: ValidatedServerConfig,
    updates: Partial<ValidatedServerConfig>
  ): ValidatedServerConfig {
    // Deep merge the configs
    const merged = ConfigManager.deepMerge(existing, updates)
    
    // Validate the merged config
    return ConfigManager.validate(merged)
  }

  /**
   * Deep merge two objects
   * 
   * Recursively merges properties from the source object into the target object.
   * For nested objects, it performs a deep merge. For arrays, it replaces rather than merges.
   * For primitive values, it overwrites the target value with the source value.
   * 
   * @param target The target object to merge into
   * @param source The source object to merge from
   * @returns A new merged object (does not modify inputs)
   * @private
   */
  private static deepMerge(target: any, source: any): any {
    const output = { ...target }
    
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        if (isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] })
          } else {
            output[key] = ConfigManager.deepMerge(target[key], source[key])
          }
        } else if (Array.isArray(source[key])) {
          // For arrays, we replace rather than merge
          output[key] = [...source[key]]
        } else {
          Object.assign(output, { [key]: source[key] })
        }
      })
    }
    
    return output
  }
}

/**
 * Helper function to check if a value is an object
 * 
 * @param item The value to check
 * @returns True if the value is an object (but not an array or null)
 * @private
 */
function isObject(item: any): boolean {
  return (item && typeof item === 'object' && !Array.isArray(item))
}