/**
 * Configuration management for MCP
 * 
 * This module provides a robust system for validating, creating, and updating
 * MCP server configurations with proper schema validation, deep merging, and
 * default values. It includes predefined configuration templates for common
 * scenarios and utilities for working with configuration objects.
 * 
 * @example
 * import { ConfigManager, defaultConfigs } from '@mandrake/mcp/config'
 * 
 * // Create a server configuration with validation
 * const config = ConfigManager.create({
 *   command: 'node',
 *   args: ['server.js'],
 *   env: { NODE_ENV: 'production' }
 * }, 'production')
 * 
 * // Update an existing configuration
 * const updatedConfig = ConfigManager.update(config, {
 *   disabled: false,
 *   healthCheck: {
 *     intervalMs: 20000
 *   }
 * })
 * 
 * @module config
 */

export * from './schema'
export * from './manager'