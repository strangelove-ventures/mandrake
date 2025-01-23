import { AIMessageChunk } from "@langchain/core/messages";

// Types for message content
interface TextContent {
  type: 'text';
  text: string;
}

interface ToolCallContent {
  type: 'tool_use';
  name: string;
  input: any;
}

type MessageContent = TextContent | ToolCallContent;
export type ParsedResponse = { content: MessageContent[] };

// State machine types remain unchanged
export type ChatState =
  | { type: 'idle' }
  | { type: 'streaming', chunk: string }
  | { type: 'processing_tool', toolName: string, input: any }
  | { type: 'error', error: Error };

export type ChatEvent =
  | { type: 'START_STREAM' }
  | { type: 'RECEIVE_CHUNK', content: string }
  | { type: 'TOOL_CALL', name: string, input: any }
  | { type: 'TOOL_COMPLETE', result: any }
  | { type: 'ERROR', error: Error }
  | { type: 'COMPLETE' };

// State machine class remains unchanged
export class ChatStateMachine {
  private state: ChatState = { type: 'idle' };
  private listeners: ((state: ChatState) => void)[] = [];

  getCurrentState(): ChatState {
    return this.state;
  }

  subscribe(listener: (state: ChatState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private setState(newState: ChatState) {
    this.state = newState;
    this.listeners.forEach(listener => listener(newState));
  }

  transition(event: ChatEvent): ChatState {
    console.log(`[ChatStateMachine] Current state: ${this.state.type}, Event: ${event.type}`);

    switch (this.state.type) {
      case 'idle':
        if (event.type === 'START_STREAM') {
          this.setState({ type: 'streaming', chunk: '' });
        }
        break;

      case 'streaming':
        switch (event.type) {
          case 'RECEIVE_CHUNK':
            this.setState({
              type: 'streaming',
              chunk: event.content
            });
            break;
          case 'TOOL_CALL':
            this.setState({
              type: 'processing_tool',
              toolName: event.name,
              input: event.input
            });
            break;
          case 'COMPLETE':
            this.setState({ type: 'idle' });
            break;
          case 'ERROR':
            this.setState({ type: 'error', error: event.error });
            break;
        }
        break;

      case 'processing_tool':
        switch (event.type) {
          case 'RECEIVE_CHUNK':
            // Allow receiving chunks while processing tool
            this.setState({
              type: 'streaming',
              chunk: event.content
            });
            break;
          case 'TOOL_COMPLETE':
            this.setState({ type: 'streaming', chunk: '' });
            break;
          case 'ERROR':
            this.setState({ type: 'error', error: event.error });
            break;
        }
        break;

      case 'error':
        if (event.type === 'START_STREAM') {
          this.setState({ type: 'streaming', chunk: '' });
        }
        break;
    }

    return this.state;
  }
}

// Updated StreamProcessor with improved chunk handling
export class StreamProcessor {
  private stateMachine: ChatStateMachine;
  private fullResponse: string = '';
  private jsonBuffer: string = '';
  private textBuffer: string = '';  // New: separate buffer for text accumulation

  constructor() {
    this.stateMachine = new ChatStateMachine();
  }

  subscribe(listener: (state: ChatState) => void) {
    return this.stateMachine.subscribe(listener);
  }

  getFullResponse(): string {
    return this.fullResponse;
  }

  async processStream(stream: AsyncGenerator<AIMessageChunk>) {
    this.stateMachine.transition({ type: 'START_STREAM' });

    try {
      for await (const chunk of stream) {
        const result = await this.processChunk(chunk);
        if (result) {
          // If we got a tool call, flush any pending text first
          await this.flushTextBuffer();
          return result;
        }
      }

      // Flush any remaining text before completing
      await this.flushTextBuffer();
      this.stateMachine.transition({ type: 'COMPLETE' });
      return null;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

private async processChunk(chunk: AIMessageChunk) {
  if (!chunk.content) return null;
  const content = chunk.content.toString();

  console.log('[StreamProcessor] Processing chunk:', content);

  // Just emit text directly unless we detect JSON
  if (!this.isJsonContent(content) && this.jsonBuffer.length === 0) {
    await this.emitText(content);
    return null;
  }

  // Handle JSON content
  this.jsonBuffer += content;
  if (this.isCompleteJson()) {
    return await this.handleJsonContent();
  }
  return null;
}

  private async flushTextBuffer() {
    if (this.textBuffer) {
      await this.emitText(this.textBuffer);
      this.textBuffer = '';
    }
  }

  private async handleJsonContent(): Promise<ToolCallContent | null> {
    try {
      const parsed = JSON.parse(this.jsonBuffer);
      const result = await this.processJsonContent(parsed);
      this.jsonBuffer = ''; // Only reset after successful processing
      return result;
    } catch (e) {
      if (this.isCompleteJson()) {
        // If we have complete but invalid JSON, treat as text
        await this.emitText(this.jsonBuffer);
        this.jsonBuffer = '';
      }
      // If incomplete, keep accumulating
      return null;
    }
  }

  private async processJsonContent(parsed: any): Promise<ToolCallContent | null> {
    if (!Array.isArray(parsed.content)) return null;

    for (const item of parsed.content) {
      if (item.type === 'text') {
        // Only emit text if not followed by a tool call
        await this.emitText(item.text);
      } else if (item.type === 'tool_use') {
        // Transition state for tool call
        this.stateMachine.transition({
          type: 'TOOL_CALL',
          name: item.name,
          input: item.input
        });

        return {
          type: 'tool_use',
          name: item.name,
          input: item.input
        };
      }
    }
    return null;
  }

  private async emitText(text: string) {
    this.fullResponse += text;
    this.stateMachine.transition({
      type: 'RECEIVE_CHUNK',
      content: text
    });
  }

  private isJsonContent(content: string): boolean {
    return content.replace(/\s+/g, '').trimStart().startsWith('{');
  }

  private isCompleteJson(): boolean {
    const sanitizedBuffer = this.jsonBuffer.replace(/\s+/g, ' ').trim();
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (const char of sanitizedBuffer) {
      if (!inString) {
        if (char === '{') depth++;
        if (char === '}') depth--;
        if (char === '"') inString = true;
      } else {
        if (char === '\\' && !escaped) {
          escaped = true;
          continue;
        }
        if (char === '"' && !escaped) inString = false;
        escaped = false;
      }
    }

    return depth === 0 && !inString && sanitizedBuffer.startsWith('{');
  }

  private handleError(error: unknown) {
    console.error('[StreamProcessor] Stream error:', error);
    this.stateMachine.transition({
      type: 'ERROR',
      error: error instanceof Error ? error : new Error(String(error))
    });
  }
}