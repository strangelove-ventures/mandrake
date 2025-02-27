import { createLogger } from '@mandrake/utils';
import { readFile, writeFile, access } from 'fs/promises';
import { z } from 'zod';
import { constants } from 'fs';

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

  /**
   * Check if the config file exists
   */
  public async exists(): Promise<boolean> {
    try {
      await access(this.path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read and parse the config file
   * Throws if file doesn't exist or is invalid
   */
  protected async read(): Promise<T> {
    try {
      // try to read the file
      const content = await readFile(this.path, 'utf-8');

      // our output data
      let data: unknown;

      // try to parse it as basic json
      try {
        data = JSON.parse(content);
      } catch (error) {
        // error for parsing json
        this.logger.error('Failed to parse config file', {
          path: this.path,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw new ConfigError(`Failed to parse config file ${this.path}`, this.path);
      }

      // try to parse it with the schema
      try {
        return this.schema.parse(data);
      } catch (error) {
        // error for schema validation
        if (error instanceof z.ZodError) {
          this.logger.error('Config file validation failed', {
            path: this.path,
            issues: error.issues
          });
          throw new ConfigError(`Config validation failed for ${this.path}`, this.path);
        }
        throw error;
      }
    } catch (error) {
      // error for reading file
      if ((error as any)?.code === 'ENOENT') {
        this.logger.error('Config file not found', { path: this.path });
        throw new ConfigError(`Config file not found: ${this.path}`, this.path);
      }
      throw error;
    }
  }

  /**
   * Write data to the config file
   */
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

  /**
   * Initialize the config file if it doesn't exist
   * This method is idempotent and can be safely called multiple times
   */
  public async init(): Promise<void> {
    const exists = await this.exists();

    if (!exists) {
      this.logger.debug('Initializing config with defaults', { path: this.path });
      const defaults = this.getDefaults();
      await this.write(defaults);
    } else {
      try {
        // Validate existing config can be read correctly
        await this.read();
        this.logger.debug('Config already exists and is valid', { path: this.path });
      } catch (error) {
        // If config exists but is invalid, repair it
        if (error instanceof ConfigError) {
          this.logger.warn('Config exists but is invalid, repairing with defaults', {
            path: this.path,
            error: error.message
          });
          const defaults = this.getDefaults();
          await this.write(defaults);
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Get default configuration values
   */
  protected abstract getDefaults(): T;
}