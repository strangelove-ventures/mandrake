/**
 * Tool calling parser utilities
 */
import { 
  type ToolCall, 
  type ToolCalls,
  type ToolResult, 
  type ToolResults,
  type ParsedToolCall, 
  type ToolCallDisplay,
  ToolParsingError, 
  ToolParsingErrorType 
} from './types';

/**
 * Regular expression to find JSON tool call blocks in text
 * Looks for patterns like: { "tool_calls": [...] }
 */
const TOOL_CALLS_REGEX = /\{[\s\n]*"tool_calls"[\s\n]*:[\s\n]*\[[\s\S]*?\][\s\n]*\}/g;

/**
 * Regular expression to find JSON tool result blocks in text
 * Looks for patterns like: { "tool_results": [...] }
 */
const TOOL_RESULTS_REGEX = /\{[\s\n]*"tool_results"[\s\n]*:[\s\n]*\[[\s\S]*?\][\s\n]*\}/g;

/**
 * Parses a tool name into server and method components
 * @param fullName The full tool name in "server.method" format
 * @returns Object with serverName and methodName or null if invalid format
 */
export function parseToolName(fullName: string): { serverName: string, methodName: string } | null {
  if (!fullName || typeof fullName !== 'string') {
    return null;
  }

  const parts = fullName.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [serverName, methodName] = parts;
  if (!serverName || !methodName) {
    return null;
  }

  return { serverName, methodName };
}

/**
 * Extracts tool calls from text content
 * @param text The text content that may contain tool calls
 * @returns Array of ToolCall objects
 */
export function extractToolCalls(text: string): ToolCall[] {
  if (!text) {
    return [];
  }

  // First, try to ensure we're extracting balanced JSON objects
  const matches: string[] = [];
  let match;
  while ((match = TOOL_CALLS_REGEX.exec(text)) !== null) {
    try {
      // Basic check for balanced braces
      const potentialJson = match[0];
      let openBraces = 0;
      let isValid = true;
      
      for (let i = 0; i < potentialJson.length; i++) {
        if (potentialJson[i] === '{') openBraces++;
        if (potentialJson[i] === '}') openBraces--;
        if (openBraces < 0) {
          isValid = false;
          break;
        }
      }
      
      if (isValid && openBraces === 0) {
        matches.push(potentialJson);
      }
    } catch (e) {
      // Skip this match if there's an error
    }
  }
  
  if (matches.length === 0) {
    return [];
  }

  const allToolCalls: ToolCall[] = [];

  for (const match of matches) {
    try {
      const parsed = JSON.parse(match) as ToolCalls;
      if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
        allToolCalls.push(...parsed.tool_calls);
      }
    } catch (e) {
      // Skip malformed JSON silently
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to parse tool call JSON:', e);
      }
    }
  }

  return allToolCalls;
}

/**
 * Extracts tool results from text content
 * @param text The text content that may contain tool results
 * @returns Array of ToolResult objects
 */
export function extractToolResults(text: string): ToolResult[] {
  if (!text) {
    return [];
  }

  // Extract only valid, balanced JSON objects
  const matches: string[] = [];
  let match;
  while ((match = TOOL_RESULTS_REGEX.exec(text)) !== null) {
    try {
      // Check for balanced braces
      const potentialJson = match[0];
      let openBraces = 0;
      let isValid = true;
      
      for (let i = 0; i < potentialJson.length; i++) {
        if (potentialJson[i] === '{') openBraces++;
        if (potentialJson[i] === '}') openBraces--;
        if (openBraces < 0) {
          isValid = false;
          break;
        }
      }
      
      if (isValid && openBraces === 0) {
        matches.push(potentialJson);
      }
    } catch (e) {
      // Skip this match if there's an error
    }
  }
  
  if (matches.length === 0) {
    return [];
  }

  const allToolResults: ToolResult[] = [];

  for (const match of matches) {
    try {
      const parsed = JSON.parse(match) as ToolResults;
      if (parsed.tool_results && Array.isArray(parsed.tool_results)) {
        allToolResults.push(...parsed.tool_results);
      }
    } catch (e) {
      // Skip malformed JSON silently
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to parse tool result JSON:', e);
      }
    }
  }

  return allToolResults;
}

/**
 * Parses a tool call into a more detailed structure
 * @param toolCall The tool call to parse
 * @returns Parsed tool call with server and method separated
 * @throws ToolParsingError if the tool call is invalid
 */
export function parseToolCall(toolCall: ToolCall): ParsedToolCall {
  if (!toolCall.name) {
    throw new ToolParsingError(
      'Tool call is missing name',
      ToolParsingErrorType.INVALID_TOOL_CALL,
      toolCall
    );
  }

  const parsed = parseToolName(toolCall.name);
  if (!parsed) {
    throw new ToolParsingError(
      `Invalid tool name format: ${toolCall.name}`,
      ToolParsingErrorType.INVALID_TOOL_NAME,
      toolCall
    );
  }

  if (!toolCall.arguments || typeof toolCall.arguments !== 'object') {
    throw new ToolParsingError(
      'Tool call is missing arguments',
      ToolParsingErrorType.MISSING_ARGUMENTS,
      toolCall
    );
  }

  return {
    serverName: parsed.serverName,
    methodName: parsed.methodName,
    arguments: toolCall.arguments,
    fullName: toolCall.name
  };
}

/**
 * Extracts and parses all tool calls from text
 * @param text The text content that may contain tool calls
 * @returns Array of ParsedToolCall objects
 */
export function extractParsedToolCalls(text: string): ParsedToolCall[] {
  const toolCalls = extractToolCalls(text);
  return toolCalls
    .map(toolCall => {
      try {
        return parseToolCall(toolCall);
      } catch (e) {
        // Skip invalid tool calls
        console.error('Failed to parse tool call:', e);
        return null;
      }
    })
    .filter((call): call is ParsedToolCall => call !== null);
}

/**
 * Extracts tool calls and results for frontend display
 * @param text The text content that may contain tool calls and results
 * @returns Array of ToolCallDisplay objects
 * 
 * Note: This function filters out tool calls with invalid names (i.e., those
 * that don't match the "server.method" format). It also filters out tool
 * results whose names can't be parsed into server and method components.
 */
export function extractToolCallsForDisplay(text: string): ToolCallDisplay[] {
  const toolCalls = extractToolCalls(text).map(call => {
    try {
      const parsed = parseToolCall(call);
      const result: ToolCallDisplay = {
        callType: 'request',
        serverName: parsed.serverName,
        methodName: parsed.methodName,
        data: parsed.arguments,
        timestamp: Date.now(),
        id: `${parsed.fullName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      return result;
    } catch (e) {
      return null;
    }
  }).filter((call): call is ToolCallDisplay => call !== null);

  const toolResults = extractToolResults(text).map(result => {
    const parsed = parseToolName(result.name);
    if (!parsed) return null;

    const resultDisplay: ToolCallDisplay = {
      callType: result.error ? 'error' : 'response',
      serverName: parsed.serverName,
      methodName: parsed.methodName,
      data: result.error || result.content,
      timestamp: Date.now(),
      id: `${result.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    return resultDisplay;
  }).filter((result): result is ToolCallDisplay => result !== null);

  // Both arrays now contain only non-null values after filtering
  // Type-cast is safe because we've filtered out null values
  const combinedResults: ToolCallDisplay[] = [...toolCalls, ...toolResults];
  return combinedResults.sort((a, b) => a.timestamp - b.timestamp);
}
