import { createLogger } from '@mandrake/utils';
import { readFile, writeFile } from 'fs/promises';
import { z } from 'zod';

export class ConfigError extends Error {
  constructor(message: string, public readonly path: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export abstract class BaseConfigManager<T> {
  protected logger;
  protected options: Record<string, string>;

  constructor(
    protected path: string,
    protected schema: z.ZodType<T>,
    options: Record<string, string>
  ) {
    this.options = options;
    this.logger = createLogger('workspace').child({ 
      meta: {
        component: 'config-manager',
        ...options
      }
    });
  }

  protected async read(): Promise<T> {
    try {
      const content = await readFile(this.path, 'utf-8');
      
      let data: unknown;
      try {
        data = JSON.parse(content);
      } catch (error) {
        this.logger.error('Failed to parse config file', { 
          path: this.path,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Return defaults for corrupted files
        return this.getDefaults();
      }

      try {
        return this.schema.parse(data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          this.logger.error('Config file validation failed', {
            path: this.path,
            issues: error.issues
          });
          // Return defaults for invalid data
          return this.getDefaults();
        }
        throw error;
      }
    } catch (error) {
      if ((error as any)?.code === 'ENOENT') {
        this.logger.info('Config file not found, using defaults', { path: this.path });
        return this.getDefaults();
      }
      throw error;
    }
  }

  protected async write(data: T): Promise<void> {
    try {
      // Validate before writing
      this.schema.parse(data);
      await writeFile(this.path, JSON.stringify(data, null, 2));
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ConfigError(`Invalid config data for ${this.path}`, this.path);
      }
      throw error;
    }
  }

  protected abstract getDefaults(): T;
}