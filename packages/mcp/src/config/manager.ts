import { createLogger } from '@mandrake/utils'
import { serverConfigSchema, defaultConfigs } from './schema'
import type { ValidatedServerConfig } from './schema'

// Logger for the config module
const logger = createLogger('mcp').child({
  meta: { component: 'config' }
})

/**
 * Configuration manager for MCP servers
 */
export class ConfigManager {
  /**
   * Validate a server configuration against the schema
   * 
   * @param config The configuration to validate
   * @returns A validated configuration with all defaults applied
   * @throws If validation fails
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
   * @param config Partial configuration
   * @param baseConfig Base configuration (defaults to 'minimal')
   * @returns A validated merged configuration
   */
  static create(
    config: Partial<ValidatedServerConfig>,
    baseConfig: keyof typeof defaultConfigs | ValidatedServerConfig = 'minimal'
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
   * @param existing The existing configuration
   * @param updates Partial updates to apply
   * @returns A new validated configuration
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
   * @param target The target object
   * @param source The source object to merge in
   * @returns A new merged object
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
 */
function isObject(item: any): boolean {
  return (item && typeof item === 'object' && !Array.isArray(item))
}