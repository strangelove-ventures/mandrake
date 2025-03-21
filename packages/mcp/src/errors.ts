/**
 * MCP Error Classes
 * 
 * Provides structured error handling for the MCP package with
 * specific error types and error codes.
 */

/**
 * Base error codes for MCP operations
 */
export enum MCPErrorCode {
  // Server related errors
  SERVER_NOT_FOUND = 'SERVER_NOT_FOUND',
  SERVER_ALREADY_EXISTS = 'SERVER_ALREADY_EXISTS',
  SERVER_DISABLED = 'SERVER_DISABLED',
  SERVER_NOT_CONNECTED = 'SERVER_NOT_CONNECTED',
  SERVER_START_FAILED = 'SERVER_START_FAILED',
  SERVER_STOP_FAILED = 'SERVER_STOP_FAILED',
  
  // Transport related errors
  TRANSPORT_CREATION_FAILED = 'TRANSPORT_CREATION_FAILED',
  TRANSPORT_CONNECTION_FAILED = 'TRANSPORT_CONNECTION_FAILED',
  TRANSPORT_CLOSED = 'TRANSPORT_CLOSED',
  
  // Proxy related errors
  PROXY_ERROR = 'PROXY_ERROR',
  PROXY_CONNECTION_FAILED = 'PROXY_CONNECTION_FAILED',
  PROXY_RECONNECTION_FAILED = 'PROXY_RECONNECTION_FAILED',
  
  // Tool related errors
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_INVOCATION_FAILED = 'TOOL_INVOCATION_FAILED',
  TOOL_RESPONSE_ERROR = 'TOOL_RESPONSE_ERROR',
  
  // Completions related errors
  COMPLETIONS_NOT_SUPPORTED = 'COMPLETIONS_NOT_SUPPORTED',
  COMPLETIONS_FAILED = 'COMPLETIONS_FAILED',
  
  // General errors
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  OPERATION_TIMEOUT = 'OPERATION_TIMEOUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Base MCP Error class
 * Extends the standard Error class with specific error codes
 * and additional metadata for better error handling and reporting.
 */
export class MCPError extends Error {
  code: MCPErrorCode
  serverId?: string
  details?: Record<string, any>
  cause?: Error

  constructor(
    message: string, 
    code: MCPErrorCode = MCPErrorCode.UNKNOWN_ERROR,
    details?: {
      serverId?: string,
      details?: Record<string, any>,
      cause?: Error
    }
  ) {
    super(message)
    this.name = 'MCPError'
    this.code = code
    
    if (details) {
      this.serverId = details.serverId
      this.details = details.details
      this.cause = details.cause
      
      // Preserve stack trace for debugging
      if (details.cause && details.cause.stack) {
        this.stack = `${this.stack}\nCaused by: ${details.cause.stack}`
      }
    }
  }

  /**
   * Convert the error to a structured object for logging or serialization
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      serverId: this.serverId,
      details: this.details,
      cause: this.cause ? this.cause.message : undefined,
      stack: this.stack
    }
  }
}

/**
 * Server not found error
 */
export class ServerNotFoundError extends MCPError {
  constructor(serverId: string, details?: Record<string, any>) {
    super(
      `Server '${serverId}' not found`, 
      MCPErrorCode.SERVER_NOT_FOUND,
      { serverId, details }
    )
    this.name = 'ServerNotFoundError'
  }
}

/**
 * Server already exists error
 */
export class ServerAlreadyExistsError extends MCPError {
  constructor(serverId: string, details?: Record<string, any>) {
    super(
      `Server '${serverId}' already exists`, 
      MCPErrorCode.SERVER_ALREADY_EXISTS,
      { serverId, details }
    )
    this.name = 'ServerAlreadyExistsError'
  }
}

/**
 * Server disabled error
 */
export class ServerDisabledError extends MCPError {
  constructor(serverId: string, details?: Record<string, any>) {
    super(
      `Server '${serverId}' is disabled`, 
      MCPErrorCode.SERVER_DISABLED,
      { serverId, details }
    )
    this.name = 'ServerDisabledError'
  }
}

/**
 * Server not connected error
 */
export class ServerNotConnectedError extends MCPError {
  constructor(serverId: string, details?: Record<string, any>) {
    super(
      `Server '${serverId}' is not connected`,
      MCPErrorCode.SERVER_NOT_CONNECTED,
      { serverId, details }
    )
    this.name = 'ServerNotConnectedError'
  }
}

/**
 * Tool invocation error
 */
export class ToolInvocationError extends MCPError {
  constructor(
    serverId: string, 
    toolName: string, 
    errorMessage: string,
    cause?: Error,
    details?: Record<string, any>
  ) {
    super(
      `Error invoking tool '${toolName}' on server '${serverId}': ${errorMessage}`,
      MCPErrorCode.TOOL_INVOCATION_FAILED,
      { serverId, details: { ...details, toolName }, cause }
    )
    this.name = 'ToolInvocationError'
  }
}

/**
 * Transport error
 */
export class TransportError extends MCPError {
  constructor(
    serverId: string,
    errorCode: MCPErrorCode = MCPErrorCode.TRANSPORT_CONNECTION_FAILED,
    cause?: Error,
    details?: Record<string, any>
  ) {
    const message = `Transport error on server '${serverId}'`
    super(
      message,
      errorCode,
      { serverId, details, cause }
    )
    this.name = 'TransportError'
  }
}

/**
 * Tool not found error
 */
export class ToolNotFoundError extends MCPError {
  constructor(serverId: string, toolName: string, details?: Record<string, any>) {
    super(
      `Tool '${toolName}' not found on server '${serverId}'`,
      MCPErrorCode.TOOL_NOT_FOUND,
      { serverId, details: { ...details, toolName } }
    )
    this.name = 'ToolNotFoundError'
  }
}

/**
 * Convert standard error to MCP error
 * 
 * Helper function to handle generic errors and convert them to the appropriate
 * MCP error types for consistency in error handling.
 */
export function convertToMCPError(
  error: any, 
  defaultCode: MCPErrorCode = MCPErrorCode.UNKNOWN_ERROR,
  defaultMessage: string = 'An unknown error occurred',
  serverId?: string,
  details?: Record<string, any>
): MCPError {
  if (error instanceof MCPError) {
    return error
  }
  
  const errorMessage = error instanceof Error ? error.message : String(error)
  
  return new MCPError(
    errorMessage || defaultMessage,
    defaultCode,
    { serverId, details, cause: error instanceof Error ? error : undefined }
  )
}