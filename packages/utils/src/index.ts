export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogMeta {
  [key: string]: any;
}

export interface LoggerOptions {
  level?: LogLevel;
  meta?: LogMeta;
}

export interface Logger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta): void;
  child(options: LoggerOptions): Logger;
}

export class ConsoleLogger implements Logger {
  private level: LogLevel;
  private meta: LogMeta;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level || 'info';
    this.meta = options.meta || {};
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private formatMeta(additionalMeta: LogMeta = {}): string {
    const meta = { ...this.meta, ...additionalMeta };
    if (Object.keys(meta).length === 0) return '';
    return JSON.stringify(meta);
  }

  debug(message: string, meta?: LogMeta): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, this.formatMeta(meta));
    }
  }

  info(message: string, meta?: LogMeta): void {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${message}`, this.formatMeta(meta));
    }
  }

  warn(message: string, meta?: LogMeta): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, this.formatMeta(meta));
    }
  }

  error(message: string, meta?: LogMeta): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, this.formatMeta(meta));
    }
  }

  child(options: LoggerOptions): Logger {
    return new ConsoleLogger({
      level: options.level || this.level,
      meta: { ...this.meta, ...(options.meta || {}) }
    });
  }
}

// Factory function to create loggers for different packages
export function createLogger(packageName: string, options: LoggerOptions = {}): Logger {
  return new ConsoleLogger({
    ...options,
    meta: { 
      package: packageName,
      ...(options.meta || {})
    }
  });
}