import { createLogger } from '@mandrake/utils';
import { join } from 'path';
import { mkdir, readFile, writeFile, readdir, rm } from 'fs/promises';
import { type FileInfo } from '../types/workspace/files';

export class FilesManager {
  private logger;
  private filesDir: string;
  private inactiveDir: string;

  constructor(workspacePath: string) {
    this.filesDir = join(workspacePath, 'files');
    this.inactiveDir = join(this.filesDir, 'inactive');
    this.logger = createLogger('workspace').child({
      meta: {
        component: 'files-manager',
        path: workspacePath
      }
    });
  }

  async init(): Promise<void> {
    await mkdir(this.filesDir, { recursive: true });
    await mkdir(this.inactiveDir, { recursive: true });
  }

  async list(active: boolean = true): Promise<FileInfo[]> {
    const dir = active ? this.filesDir : this.inactiveDir;
    const files = await readdir(dir);
    
    const fileInfos = await Promise.all(
      files
        .filter(f => f !== 'inactive') // Skip the inactive directory when listing active
        .map(async (name) => ({
          name,
          content: await readFile(join(dir, name), 'utf-8'),
          active,
        }))
    );

    return fileInfos;
  }

  async get(name: string): Promise<FileInfo> {
    try {
      const content = await readFile(join(this.filesDir, name), 'utf-8');
      return { name, content, active: true };
    } catch (error) {
      try {
        const content = await readFile(join(this.inactiveDir, name), 'utf-8');
        return { name, content, active: false };
      } catch (error) {
        throw new Error(`File ${name} not found`);
      }
    }
  }

  async create(name: string, content: string, active: boolean = true): Promise<void> {
    await this.init();
    const dir = active ? this.filesDir : this.inactiveDir;
    const path = join(dir, name);

    try {
      await this.get(name);
      throw new Error(`File ${name} already exists`);
    } catch (error) {
      if ((error as Error).message === `File ${name} not found`) {
        await writeFile(path, content);
      } else {
        throw error;
      }
    }
  }

  async update(name: string, content: string): Promise<void> {
    const file = await this.get(name);
    const dir = file.active ? this.filesDir : this.inactiveDir;
    await writeFile(join(dir, name), content);
  }

  async delete(name: string): Promise<void> {
    try {
      await rm(join(this.filesDir, name));
    } catch {
      try {
        await rm(join(this.inactiveDir, name));
      } catch {
        throw new Error(`File ${name} not found`);
      }
    }
  }

  async setActive(name: string, active: boolean): Promise<void> {
    const file = await this.get(name);
    if (file.active === active) return;

    const sourceDir = file.active ? this.filesDir : this.inactiveDir;
    const targetDir = file.active ? this.inactiveDir : this.filesDir;

    await writeFile(join(targetDir, name), file.content);
    await rm(join(sourceDir, name));
  }
}
