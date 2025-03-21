/**
 * Log entry structure with timestamp and metadata
 */
export interface LogEntry {
  message: string;
  timestamp: number;
  level?: 'debug' | 'info' | 'warning' | 'error';
  metadata?: Record<string, any>;
}

/**
 * LogBuffer configuration options
 */
export interface LogBufferOptions {
  maxLogs?: number;
  maxLogLength?: number;
  includeTimestamp?: boolean;
  logToConsole?: boolean;
}

/**
 * Enhanced LogBuffer with timestamp support and structured logs
 * 
 * This implementation improves upon the original with:
 * - Timestamp support for each log entry
 * - Structured log entries with level and metadata
 * - Optional console output for visibility
 * - Configurable capacity and log truncation
 */
export class LogBuffer {
  private logs: LogEntry[] = []
  private maxLogs: number
  private maxLogLength: number
  private includeTimestamp: boolean
  private logToConsole: boolean

  constructor(options: LogBufferOptions = {}) {
    this.maxLogs = options.maxLogs ?? 100
    this.maxLogLength = options.maxLogLength ?? 1000
    this.includeTimestamp = options.includeTimestamp ?? true
    this.logToConsole = options.logToConsole ?? false
  }

  /**
   * Append a log message to the buffer
   * 
   * @param message The log message text
   * @param level Optional log level (debug, info, warning, error)
   * @param metadata Optional metadata to attach to the log
   */
  append(message: string, level?: 'debug' | 'info' | 'warning' | 'error', metadata?: Record<string, any>) {
    // Truncate long logs
    const truncated = message.length > this.maxLogLength 
      ? message.slice(0, this.maxLogLength) + "..."
      : message

    // Create structured log entry
    const logEntry: LogEntry = {
      message: truncated,
      timestamp: Date.now(), // Always store timestamp internally
      ...(level && { level }),
      ...(metadata && { metadata })
    }

    // Add to log buffer
    this.logs.push(logEntry)
    
    // Optional console output
    if (this.logToConsole) {
      const timestamp = new Date(logEntry.timestamp).toISOString()
      const levelStr = level ? `[${level.toUpperCase()}]` : ''
      const metaStr = metadata ? JSON.stringify(metadata) : ''
      
      console.log(`${timestamp} ${levelStr} ${truncated} ${metaStr}`)
    }
    
    // Remove old logs if buffer full
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }
  }

  /**
   * Get all logs in the buffer
   * 
   * @param asStrings Whether to return logs as formatted strings (default: true)
   * @returns Array of logs, either as formatted strings or structured LogEntry objects
   */
  getLogs(asStrings: boolean = true): string[] | LogEntry[] {
    if (asStrings) {
      return this.logs.map(entry => {
        if (this.includeTimestamp) {
          const time = new Date(entry.timestamp).toISOString()
          const levelStr = entry.level ? `[${entry.level.toUpperCase()}]` : ''
          return `${time} ${levelStr} ${entry.message}`
        }
        return entry.message
      })
    }
    return [...this.logs]
  }

  /**
   * Get logs filtered by level
   * 
   * @param level The log level to filter by
   * @param asStrings Whether to return logs as formatted strings
   * @returns Filtered logs
   */
  getLogsByLevel(level: 'debug' | 'info' | 'warning' | 'error', asStrings: boolean = true): string[] | LogEntry[] {
    const filtered = this.logs.filter(entry => entry.level === level)
    
    if (asStrings) {
      return filtered.map(entry => {
        if (this.includeTimestamp) {
          const time = new Date(entry.timestamp).toISOString()
          return `${time} [${level.toUpperCase()}] ${entry.message}`
        }
        return entry.message
      })
    }
    return [...filtered]
  }

  /**
   * Search logs for a specific pattern
   * 
   * @param pattern Text pattern to search for
   * @param asStrings Whether to return logs as formatted strings
   * @returns Logs matching the search pattern
   */
  searchLogs(pattern: string, asStrings: boolean = true): string[] | LogEntry[] {
    const regex = new RegExp(pattern, 'i')
    const filtered = this.logs.filter(entry => regex.test(entry.message))
    
    if (asStrings) {
      return filtered.map(entry => {
        if (this.includeTimestamp) {
          const time = new Date(entry.timestamp).toISOString()
          const levelStr = entry.level ? `[${entry.level.toUpperCase()}]` : ''
          return `${time} ${levelStr} ${entry.message}`
        }
        return entry.message
      })
    }
    return [...filtered]
  }

  /**
   * Clear all logs from the buffer
   */
  clear() {
    this.logs = []
  }

  /**
   * Get the number of logs in the buffer
   */
  get length(): number {
    return this.logs.length
  }
  
  /**
   * Convenience methods for logging at specific levels
   */
  debug(message: string, metadata?: Record<string, any>) {
    this.append(message, 'debug', metadata)
  }
  
  info(message: string, metadata?: Record<string, any>) {
    this.append(message, 'info', metadata)
  }
  
  warn(message: string, metadata?: Record<string, any>) {
    this.append(message, 'warning', metadata)
  }
  
  error(message: string, metadata?: Record<string, any>) {
    this.append(message, 'error', metadata)
  }
}
