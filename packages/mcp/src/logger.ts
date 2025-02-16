export class LogBuffer {
  private logs: string[] = []
  private static MAX_LOGS = 100
  private static MAX_LOG_LENGTH = 1000

  append(log: string) {
    // Truncate long logs
    const truncated = log.length > LogBuffer.MAX_LOG_LENGTH 
      ? log.slice(0, LogBuffer.MAX_LOG_LENGTH) + "..."
      : log

    this.logs.push(truncated)
    
    // Remove old logs if buffer full
    if (this.logs.length > LogBuffer.MAX_LOGS) {
      this.logs.shift()
    }
  }

  getLogs(): string[] {
    return [...this.logs]
  }

  clear() {
    this.logs = []
  }

  get length(): number {
    return this.logs.length
  }
}
