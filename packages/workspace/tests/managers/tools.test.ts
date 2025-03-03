import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { ToolsManager } from '../../src/managers/tools';
import type { ServerConfig, ToolConfig } from '../../src/types/workspace/tools';

describe('ToolsManager', () => {
  let tmpDir: string;
  let configPath: string;
  let manager: ToolsManager;

  const testServer: ServerConfig = {
    command: 'test-server',
    args: ['--config', 'test.json'],
    env: {
      TEST_ENV: 'value',
    },
  };

  const testToolConfig: ToolConfig = {
    'test': testServer,
  };

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'tools-test-'));
    configPath = join(tmpDir, 'tools.json');
    manager = new ToolsManager(configPath);
    await manager.init();
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('config set operations', () => {
    test('lists default config set', async () => {
      const sets = await manager.listConfigSets();
      expect(sets).toContain('default');
    });

    test('adds and gets config set', async () => {
      await manager.addConfigSet('custom', testToolConfig);
      const config = await manager.getConfigSet('custom');
      expect(config).toEqual(testToolConfig);
    });

    test('updates config set', async () => {
      await manager.addConfigSet('custom', testToolConfig);
      const updates: Partial<ToolConfig> = {
        'test': { ...testServer, disabled: true },
      };
      await manager.updateConfigSet('custom', updates);
      const config = await manager.getConfigSet('custom');
      expect(config['test'].disabled).toBe(true);
    });

    test('removes config set', async () => {
      await manager.addConfigSet('custom', testToolConfig);
      await manager.setActive('custom');
      
      await manager.removeConfigSet('custom');
      
      const sets = await manager.listConfigSets();
      expect(sets).not.toContain('custom');
      const active = await manager.getActive();
      expect(active).toBe('default');
    });

    test('throws on duplicate config set', async () => {
      await manager.addConfigSet('custom', testToolConfig);
      await expect(manager.addConfigSet('custom', testToolConfig))
        .rejects.toThrow('Config set custom already exists');
    });
  });

  describe('server config operations', () => {
    beforeEach(async () => {
      await manager.addConfigSet('custom', {});
    });

    test('adds and gets server config', async () => {
      await manager.addServerConfig('custom', 'test', testServer);
      const config = await manager.getServerConfig('custom', 'test');
      expect(config).toEqual(testServer);
    });

    test('updates server config', async () => {
      await manager.addServerConfig('custom', 'test', testServer);
      await manager.updateServerConfig('custom', 'test', { disabled: true });
      const config = await manager.getServerConfig('custom', 'test');
      expect(config.disabled).toBe(true);
    });

    test('removes server config', async () => {
      await manager.addServerConfig('custom', 'test', testServer);
      await manager.removeServerConfig('custom', 'test');
      const configSet = await manager.getConfigSet('custom');
      expect(configSet['test']).toBeUndefined();
    });

    test('throws when config set not found', async () => {
      await expect(manager.addServerConfig('missing', 'test', testServer))
        .rejects.toThrow('Config set missing not found');
    });

    test('throws on duplicate server in set', async () => {
      await manager.addServerConfig('custom', 'test', testServer);
      await expect(manager.addServerConfig('custom', 'test', testServer))
        .rejects.toThrow('Server test already exists in config set custom');
    });
  });

  describe('active config set operations', () => {
    test('gets default active config set', async () => {
      const active = await manager.getActive();
      expect(active).toBe('default');
    });

    test('sets and gets active config set', async () => {
      await manager.addConfigSet('custom', testToolConfig);
      await manager.setActive('custom');
      const active = await manager.getActive();
      expect(active).toBe('custom');
    });

    test('throws when setting non-existent config set as active', async () => {
      await expect(manager.setActive('missing'))
        .rejects.toThrow('Config set missing not found');
    });
  });

  describe('defaults', () => {
    test('provides default ripper server', async () => {
      const config = await manager.getConfigSet('default');
      expect(config.ripper).toBeDefined();
      expect(config.ripper.command).toBe('ripper-server');
    });
  });
});
