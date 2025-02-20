import { expect, test, describe, beforeEach } from 'bun:test';
import { readFiles } from '../../src/tools';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';

describe('read_files tool', () => {
  const tmpDir = tmpdir();
  let testRoot: string;
  let testDir: string;
  let allowedDirs: string[];

  beforeEach(async () => {
    // Create unique test directory
    testRoot = join(tmpDir, `ripper-test-${Date.now()}`);
    testDir = join(testRoot, 'test-dir');
    allowedDirs = [testDir];
    
    // Create test directory
    await mkdir(testDir, { recursive: true });
  });

  test('reads single file successfully', async () => {
    const testFile = join(testDir, 'test.txt');
    const content = 'test content';
    await writeFile(testFile, content);

    const result = await readFiles.execute({
      paths: [testFile],
      allowedDirs
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].content).toBe(content);
    expect(parsed[0].error).toBeUndefined();
  });

  test('reads multiple files successfully', async () => {
    const files = [
      { name: 'test1.txt', content: 'content 1' },
      { name: 'test2.txt', content: 'content 2' }
    ];

    for (const file of files) {
      await writeFile(join(testDir, file.name), file.content);
    }

    const result = await readFiles.execute({
      paths: files.map(f => join(testDir, f.name)),
      allowedDirs
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(2);
    
    for (let i = 0; i < files.length; i++) {
      expect(parsed[i].content).toBe(files[i].content);
      expect(parsed[i].error).toBeUndefined();
    }
  });

  test('handles non-existent file', async () => {
    const nonexistentFile = join(testDir, 'nonexistent.txt');

    const result = await readFiles.execute({
      paths: [nonexistentFile],
      allowedDirs
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].error).toBeDefined();
  });

  test('handles file outside allowed directories', async () => {
    const outsideFile = join(testRoot, 'outside.txt');
    await writeFile(outsideFile, 'test');

    const result = await readFiles.execute({
      paths: [outsideFile],
      allowedDirs
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].error).toBeDefined();
  });
});