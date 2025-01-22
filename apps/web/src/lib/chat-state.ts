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

// State machine types
export type ChatState = 
  | { type: 'idle' }
  | { type: 'streaming', chunk: string }  // Changed from buffer to chunk
  | { type: 'processing_tool', toolName: string, input: any }
  | { type: 'error', error: Error };

// Events that can trigger state changes
export type ChatEvent =
  | { type: 'START_STREAM' }
  | { type: 'RECEIVE_CHUNK', content: string }
  | { type: 'TOOL_CALL', name: string, input: any }
  | { type: 'TOOL_COMPLETE', result: any }
  | { type: 'ERROR', error: Error }
  | { type: 'COMPLETE' };

// State machine class
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
              chunk: event.content  // Just the new chunk
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

// Stream processing helper
export class StreamProcessor {
  private stateMachine: ChatStateMachine;
  private fullResponse: string = '';
  
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

    let jsonBuffer = '';

    try {
      for await (const chunk of stream) {
        if (!chunk.content) continue;

        const content = chunk.content.toString();

        // Accumulate JSON content
        if (this.isJsonStart(content) || jsonBuffer) {
          jsonBuffer += content;

          try {
            const parsed = JSON.parse(jsonBuffer);
            jsonBuffer = ''; // Reset buffer after successful parse

            if (Array.isArray(parsed.content)) {
              for (const item of parsed.content) {
                if (item.type === 'text') {
                  this.fullResponse += item.text;
                  this.stateMachine.transition({
                    type: 'RECEIVE_CHUNK',
                    content: item.text
                  });
                } else if (item.type === 'tool_use') {
                  // Tool call found, transition and return it
                  this.stateMachine.transition({
                    type: 'TOOL_CALL',
                    name: item.name,
                    input: item.input
                  });
                  return item;
                }
              }
            }
          } catch (e) {
            // Incomplete JSON, continue buffering
            continue;
          }
        } else if (this.stateMachine.getCurrentState().type === 'processing_tool') {
          // While processing tool, still show output
          this.fullResponse += content;
          this.stateMachine.transition({
            type: 'RECEIVE_CHUNK',
            content: content
          });
        } else {
          // Normal text handling
          this.fullResponse += content;
          this.stateMachine.transition({
            type: 'RECEIVE_CHUNK',
            content: content
          });
        }
      }

      // Stream complete
      this.stateMachine.transition({ type: 'COMPLETE' });
      return null;
    } catch (error) {
      this.stateMachine.transition({
        type: 'ERROR',
        error: error instanceof Error ? error : new Error(String(error))
      });
      throw error;
    }
  }

  private isJsonStart(content: string): boolean {
    return content.toString().trim().startsWith('{');
  }
}