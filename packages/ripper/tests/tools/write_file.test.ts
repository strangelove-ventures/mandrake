import { expect, test, describe, beforeEach } from 'bun:test';
import { writeFile } from '../../src/tools';
import { join } from 'path';
import { mkdir, readFile } from 'fs/promises';
import { tmpdir } from 'os';

describe('write_file tool', () => {
  const tmpDir = tmpdir();
  let testRoot: string;
  let testDir: string;
  let allowedDirs: string[];

  beforeEach(async () => {
    testRoot = join(tmpDir, `ripper-test-${Date.now()}`);
    testDir = join(testRoot, 'test-dir');
    allowedDirs = [testDir];
    await mkdir(testDir, { recursive: true });
  });

  test('writes new file successfully', async () => {
    const testFile = join(testDir, 'test.txt');
    const content = 'test content';

    const result = await writeFile.execute({
      path: testFile,
      content,
      allowedDirs
    });

    // Check result
    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);

    // Verify file content
    const writtenContent = await readFile(testFile, 'utf-8');
    expect(writtenContent).toBe(content);
  });

  test('overwrites existing file', async () => {
    const testFile = join(testDir, 'test.txt');
    await Bun.write(testFile, 'original content');

    const newContent = 'new content';
    const result = await writeFile.execute({
      path: testFile,
      content: newContent,
      allowedDirs
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);

    const writtenContent = await readFile(testFile, 'utf-8');
    expect(writtenContent).toBe(newContent);
  });

  test('creates parent directories if needed', async () => {
    const deepFile = join(testDir, 'deep', 'nested', 'test.txt');
    const content = 'test content';

    const result = await writeFile.execute({
      path: deepFile,
      content,
      allowedDirs
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);

    const writtenContent = await readFile(deepFile, 'utf-8');
    expect(writtenContent).toBe(content);
  });

  test('handles file outside allowed directories', async () => {
    const outsideFile = join(testRoot, 'outside.txt');
    const content = 'test content';

    const result = await writeFile.execute({
      path: outsideFile,
      content,
      allowedDirs
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toBeDefined();
  });
});