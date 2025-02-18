import { mkdtemp, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { FilesManager } from '../../src/managers/files';

describe('FilesManager', () => {
  let tmpDir: string;
  let manager: FilesManager;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'files-test-'));
    manager = new FilesManager(tmpDir);
    await manager.init();
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('file operations', () => {
    test('creates and gets file', async () => {
      await manager.create('test.md', 'content');
      const file = await manager.get('test.md');
      expect(file).toEqual({
        name: 'test.md',
        content: 'content',
        active: true,
      });
    });

    test('lists files', async () => {
      await manager.create('test1.md', 'content1');
      await manager.create('test2.md', 'content2');
      const files = await manager.list();
      expect(files).toHaveLength(2);
      expect(files.map(f => f.name)).toContain('test1.md');
      expect(files.map(f => f.name)).toContain('test2.md');
    });

    test('updates file', async () => {
      await manager.create('test.md', 'content');
      await manager.update('test.md', 'new content');
      const file = await manager.get('test.md');
      expect(file.content).toBe('new content');
    });

    test('deletes file', async () => {
      await manager.create('test.md', 'content');
      await manager.delete('test.md');
      await expect(manager.get('test.md')).rejects.toThrow('File test.md not found');
    });

    test('throws on duplicate file', async () => {
      await manager.create('test.md', 'content');
      await expect(manager.create('test.md', 'content'))
        .rejects.toThrow('File test.md already exists');
    });

    test('throws when getting non-existent file', async () => {
      await expect(manager.get('missing.md'))
        .rejects.toThrow('File missing.md not found');
    });
  });

  describe('active/inactive operations', () => {
    test('creates inactive file', async () => {
      await manager.create('test.md', 'content', false);
      const file = await manager.get('test.md');
      expect(file.active).toBe(false);
    });

    test('lists inactive files', async () => {
      await manager.create('test1.md', 'content1', false);
      await manager.create('test2.md', 'content2', false);
      const files = await manager.list(false);
      expect(files).toHaveLength(2);
      expect(files.every(f => !f.active)).toBe(true);
    });

    test('moves file between active and inactive', async () => {
      await manager.create('test.md', 'content');
      await manager.setActive('test.md', false);
      
      let file = await manager.get('test.md');
      expect(file.active).toBe(false);

      await manager.setActive('test.md', true);
      file = await manager.get('test.md');
      expect(file.active).toBe(true);
    });

    test('updates inactive file', async () => {
      await manager.create('test.md', 'content', false);
      await manager.update('test.md', 'new content');
      const file = await manager.get('test.md');
      expect(file.content).toBe('new content');
      expect(file.active).toBe(false);
    });

    test('maintains file content when changing active state', async () => {
      await manager.create('test.md', 'content');
      await manager.setActive('test.md', false);
      const file = await manager.get('test.md');
      expect(file.content).toBe('content');
    });

    test('does nothing when setting active to current state', async () => {
      await manager.create('test.md', 'content');
      await manager.setActive('test.md', true);
      const file = await manager.get('test.md');
      expect(file.active).toBe(true);
    });
  });
});
