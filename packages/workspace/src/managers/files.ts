import { createLogger, type FileInfo } from '@mandrake/utils';
import { join } from 'path';
import { mkdir, readFile, writeFile, readdir, rm } from 'fs/promises';

export class FilesManager {
  private logger;
  private path: string;
  private inactive: string;

  constructor(path: string) {
    this.path = path;
    this.inactive = join(this.path, 'inactive');
    this.logger = createLogger('workspace').child({
      meta: {
        component: 'files-manager',
        path: this.path,
        inactive: this.inactive
      }
    });
  }

  async init(): Promise<void> {
    await mkdir(this.path, { recursive: true });
    await mkdir(this.inactive, { recursive: true });
  }

  async list(active: boolean = true): Promise<FileInfo[]> {
    const dir = active ? this.path : this.inactive;
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
      const content = await readFile(join(this.path, name), 'utf-8');
      return { name, content, active: true };
    } catch (error) {
      try {
        const content = await readFile(join(this.inactive, name), 'utf-8');
        return { name, content, active: false };
      } catch (error) {
        throw new Error(`File ${name} not found`);
      }
    }
  }

  async create(name: string, content: string, active: boolean = true): Promise<void> {
    await this.init();
    const dir = active ? this.path : this.inactive;
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
    const dir = file.active ? this.path : this.inactive;
    await writeFile(join(dir, name), content);
  }

  async delete(name: string): Promise<void> {
    try {
      await rm(join(this.path, name));
    } catch {
      try {
        await rm(join(this.inactive, name));
      } catch {
        throw new Error(`File ${name} not found`);
      }
    }
  }

  async setActive(name: string, active: boolean): Promise<void> {
    const file = await this.get(name);
    if (file.active === active) return;

    const sourceDir = file.active ? this.path : this.inactive;
    const targetDir = file.active ? this.inactive : this.path;

    await writeFile(join(targetDir, name), file.content);
    await rm(join(sourceDir, name));
  }
}
