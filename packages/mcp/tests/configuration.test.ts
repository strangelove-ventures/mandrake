import { describe, test, expect } from 'bun:test'
import { ConfigManager, defaultConfigs } from '../src/config'
import { HealthCheckStrategy } from '../src/types'

describe('MCP Configuration Management', () => {
  test('validates config with schema', () => {
    // Valid config with minimal required fields
    const valid = {
      command: 'echo'
    }

    // Should validate and fill in defaults
    const result = ConfigManager.validate(valid)
    expect(result.command).toEqual('echo')
    expect(result.args).toEqual([])
    // We can't expect an empty env since we may inherit the environment
    expect(typeof result.env).toEqual('object')
    expect(result.disabled).toEqual(false)
    expect(result.healthCheck).toBeDefined()
    expect(result.healthCheck.strategy).toEqual(HealthCheckStrategy.TOOL_LISTING)
  })

  test('rejects invalid config', () => {
    // Missing required command field
    const invalid = {
      args: ['test']
    }

    // Should throw validation error
    expect(() => ConfigManager.validate(invalid)).toThrow()
  })

  test('creates config from defaults', () => {
    // Create from minimal base with custom command
    const config = ConfigManager.create({
      command: 'test-command'
    }, 'minimal')

    expect(config.command).toEqual('test-command')
    expect(config.args).toEqual(['Server not configured']) // This is from the minimal default config
    expect(config.healthCheck.strategy).toEqual(HealthCheckStrategy.TOOL_LISTING)
  })

  test('creates config with development defaults', () => {
    // Create from development base with custom command
    const config = ConfigManager.create({
      command: 'test-command'
    }, 'development')

    expect(config.command).toEqual('test-command')
    expect(config.healthCheck.intervalMs).toEqual(15000) // Development setting
    expect(config.healthCheck.retries).toEqual(2) // Development setting
  })

  test('performs deep merging of configs', () => {
    // Start with development config
    const base = defaultConfigs.development
    
    // Update with partial config that includes nested healthCheck
    const config = ConfigManager.update(base, {
      command: 'updated-command',
      healthCheck: {
        timeoutMs: 8000 // Only change timeout
      }
    })

    // Command should be updated
    expect(config.command).toEqual('updated-command')
    
    // Health check should merge (not replace)
    expect(config.healthCheck.timeoutMs).toEqual(8000) // Updated
    expect(config.healthCheck.intervalMs).toEqual(15000) // Preserved from base
    expect(config.healthCheck.retries).toEqual(2) // Preserved from base
  })

  test('replaces arrays instead of merging them', () => {
    // Start with config that has args
    const base = ConfigManager.create({
      command: 'base',
      args: ['one', 'two']
    })
    
    // Update with new args
    const config = ConfigManager.update(base, {
      args: ['three', 'four']
    })

    // Args should be replaced, not merged
    expect(config.args).toEqual(['three', 'four'])
  })
})