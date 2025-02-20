import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { join } from 'path';
import os from 'os';
import { stat, rm, mkdir, realpath } from 'fs/promises';
import {
  executeCommand,
  validateCommand,
  type CommandOptions
} from '../../src/utils/command';
import { RipperError, ErrorCode } from '../../src/utils/errors';

describe('Command Utilities', () => {
  describe('validateCommand', () => {
    test('accepts safe commands', () => {
      const safeCmds = [
        'ls -la',
        'echo "hello world"',
        'cat file.txt',
        'mkdir -p test/dir',
        'node script.js',
        'bun test',
      ];

      safeCmds.forEach(cmd => {
        expect(() => validateCommand(cmd)).not.toThrow();
      });
    });

    test('rejects unsafe commands', () => {
      const unsafeCmds = [
        'rm -rf /',
        'rm -r foo',
        'echo "test" > file.txt',
        'cat file.txt | sudo bash',
        'sudo npm install',
        'chmod 777 file',
        'mkfs.ext4 /dev/sda1',
        'dd if=/dev/zero',
        'shutdown -r now',
      ];

      unsafeCmds.forEach(cmd => {
        expect(() => validateCommand(cmd))
          .toThrow(RipperError);
      });
    });
  });

  describe('executeCommand', () => {
    const testDir = join(os.tmpdir(), 'ripper-test');
    
    beforeEach(async () => {
      // Remove any existing directory first
      try {
        await rm(testDir, { recursive: true, force: true });
      } catch (err) {
        // Ignore removal errors
      }

      // Create directory
      await mkdir(testDir, { recursive: true, mode: 0o755 });

      // Verify directory exists and is accessible
      const stats = await stat(testDir);
      if (!stats.isDirectory()) {
        throw new Error('Test directory was not created as a directory');
      }
    });

    afterEach(async () => {
      try {
        await rm(testDir, { recursive: true, force: true });
      } catch (err) {
        // Ignore cleanup errors
      }
    });

    test('executes simple command', async () => {
      const result = await executeCommand('echo "test"');
      expect(result.stdout.trim()).toBe('test');
      expect(result.code).toBe(0);
    });

    test('handles working directory', async () => {
      const options: CommandOptions = { cwd: testDir };
      const result = await executeCommand('pwd', options);
      const realTestDir = await realpath(testDir);
      expect(result.stdout.trim()).toBe(realTestDir);
    });

    test('fails on non-existent working directory', async () => {
      const options: CommandOptions = { cwd: join(testDir, 'nonexistent') };
      await expect(executeCommand('pwd', options))
        .rejects
        .toThrow('Working directory does not exist');
    });

    test('handles environment variables', async () => {
      const options: CommandOptions = {
        env: { TEST_VAR: 'test-value' }
      };
      const result = await executeCommand('echo $TEST_VAR', options);
      expect(result.stdout.trim()).toBe('test-value');
    });

    test('captures stderr', async () => {
      const result = await executeCommand('node -e "process.stderr.write(\'test error\')"');
      expect(result.stderr).toBe('test error');
    });

    test('fails on non-zero exit code', async () => {
      await expect(executeCommand('ls nonexistent-file'))
        .rejects
        .toThrow(RipperError);
    });

    test('rejects unsafe commands', async () => {
      await expect(executeCommand('rm -rf /'))
        .rejects
        .toThrow(RipperError);
    });
  });
});