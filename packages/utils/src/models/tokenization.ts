import type { Message } from '../common-types';
import type { ProviderType } from './schemas';

// Import tokenizers when available
let tiktoken: any;
let anthropicTokenizer: any;
let llama3Tokenizer: any;

// Dynamically import tokenizers to avoid bundling issues
try {
  // These imports might fail in some environments
  // We'll handle it gracefully with fallbacks
  tiktoken = require('tiktoken');
  anthropicTokenizer = require('@anthropic-ai/tokenizer');
  llama3Tokenizer = require('llama3-tokenizer-js').default;
} catch (e) {
  console.warn('Some tokenizer libraries could not be loaded. Falling back to approximate tokenization.');
}

/**
 * Interface for counting tokens in text and messages
 */
export interface TokenCounter {
  /**
   * Count tokens in a text string
   * @param text Text to count tokens in
   * @returns Number of tokens
   */
  countTokens(text: string): number;

  /**
   * Count tokens in an array of messages
   * @param messages Messages to count tokens in
   * @returns Total number of tokens across all messages
   */
  countMessageTokens(messages: Message[]): number;
}

/**
 * Approximates tokens based on characters (as a fallback)
 * Uses simple 4 characters = 1 token approximation
 */
export class CharacterBasedCounter implements TokenCounter {
  // Characters per token - a rough approximation
  private readonly CHARS_PER_TOKEN = 4;

  countTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }

  countMessageTokens(messages: Message[]): number {
    if (!messages || messages.length === 0) return 0;
    
    let total = 0;
    for (const message of messages) {
      // Count role as a token
      total += 1;
      
      // Count content tokens
      if (message.content) {
        total += this.countTokens(message.content);
      }
    }
    
    return total;
  }
}

/**
 * Anthropic-specific token counter
 * Uses Claude's tokenization approach from the official library when available
 */
export class AnthropicTokenCounter implements TokenCounter {
  // Message format overhead in tokens
  private readonly MESSAGE_OVERHEAD = 4;
  
  countTokens(text: string): number {
    if (!text) return 0;
    
    try {
      // Use the official Anthropic tokenizer if available
      if (anthropicTokenizer && anthropicTokenizer.countTokens) {
        return anthropicTokenizer.countTokens(text);
      }
    } catch (e) {
      console.warn('Anthropic tokenizer failed, falling back to approximation', e);
    }
    
    // Fallback to approximation (Claude uses ~5 characters per token on average)
    return Math.ceil(text.length / 5);
  }
  
  countMessageTokens(messages: Message[]): number {
    if (!messages || messages.length === 0) return 0;
    
    let total = 0;
    
    // Add approximate format overhead for each message
    total += messages.length * this.MESSAGE_OVERHEAD;
    
    for (const message of messages) {
      // Count content tokens
      if (message.content) {
        total += this.countTokens(message.content);
      }
    }
    
    return total;
  }
}

/**
 * OpenAI-specific token counter
 * Uses tiktoken library when available
 */
export class OpenAITokenCounter implements TokenCounter {
  private encoder: any = null;
  
  // Message format overhead in tokens per message
  private readonly MESSAGE_OVERHEAD = 3;
  
  constructor(private model: string = 'gpt-3.5-turbo') {
    // Try to initialize the encoder
    this.initEncoder();
  }
  
  private initEncoder() {
    try {
      if (tiktoken && tiktoken.encoding_for_model) {
        this.encoder = tiktoken.encoding_for_model(this.model);
      }
    } catch (e) {
      console.warn(`Could not initialize tiktoken encoder for model ${this.model}`, e);
    }
  }
  
  countTokens(text: string): number {
    if (!text) return 0;
    
    try {
      // Use tiktoken if available
      if (this.encoder) {
        return this.encoder.encode(text).length;
      }
    } catch (e) {
      console.warn('Tiktoken encoding failed, falling back to approximation', e);
    }
    
    // Fallback to approximation (GPT models use ~4 characters per token on average)
    return Math.ceil(text.length / 4);
  }
  
  countMessageTokens(messages: Message[]): number {
    if (!messages || messages.length === 0) return 0;
    
    // If tiktoken is available, use a more accurate method for counting message tokens
    if (this.encoder) {
      try {
        let tokenCount = 0;
        
        // Add per-message overhead (3 tokens per message)
        tokenCount += messages.length * this.MESSAGE_OVERHEAD;
        
        // GPT models add extra tokens for role markers
        for (const message of messages) {
          // Add role format tokens
          tokenCount += 1;
          
          // Add content tokens
          if (message.content) {
            tokenCount += this.encoder.encode(message.content).length;
          }
        }
        
        // Every reply is primed with <|start|>assistant<|message|>
        tokenCount += 3;
        
        return tokenCount;
      } catch (e) {
        console.warn('Tiktoken message counting failed, falling back to approximation', e);
      }
    }
    
    // Fallback to simpler approximation
    let total = 0;
    
    // Add format overhead for each message
    total += messages.length * this.MESSAGE_OVERHEAD;
    
    for (const message of messages) {
      // Count tokens in role (approximation)
      total += 1;
      
      // Count content tokens
      if (message.content) {
        total += this.countTokens(message.content);
      }
    }
    
    return total;
  }
  
  free() {
    // Clean up tiktoken encoder if it was created
    try {
      if (this.encoder && typeof this.encoder.free === 'function') {
        this.encoder.free();
        this.encoder = null;
      }
    } catch (e) {
      console.warn('Error freeing tiktoken encoder', e);
    }
  }
}

/**
 * LLaMA-specific token counter
 * Uses llama3-tokenizer-js when available
 */
export class LlamaTokenCounter implements TokenCounter {
  // Message format overhead in tokens
  private readonly MESSAGE_OVERHEAD = 3;
  
  countTokens(text: string): number {
    if (!text) return 0;
    
    try {
      // Use the LLaMA 3 tokenizer if available
      if (llama3Tokenizer && llama3Tokenizer.encode) {
        return llama3Tokenizer.encode(text, { bos: false, eos: false }).length;
      }
    } catch (e) {
      console.warn('LLaMA tokenizer failed, falling back to approximation', e);
    }
    
    // Fallback to approximation (LLaMA 3 uses ~4 characters per token on average)
    return Math.ceil(text.length / 4);
  }
  
  countMessageTokens(messages: Message[]): number {
    if (!messages || messages.length === 0) return 0;
    
    let total = 0;
    
    // Add approximate format overhead for each message
    total += messages.length * this.MESSAGE_OVERHEAD;
    
    // For LLaMA chat templates, include BOS and EOS tokens
    total += 2;
    
    for (const message of messages) {
      // Count content tokens
      if (message.content) {
        total += this.countTokens(message.content);
      }
    }
    
    return total;
  }
}

/**
 * Factory function to get the appropriate token counter for a provider and model
 */
export function getTokenCounter(provider: ProviderType, model?: string): TokenCounter {
  switch (provider.toLowerCase()) {
    case 'anthropic':
      return new AnthropicTokenCounter();
    case 'openai':
      return new OpenAITokenCounter(model);
    case 'ollama':
      return new LlamaTokenCounter();
    case 'meta':
      return new LlamaTokenCounter();
    default:
      return new CharacterBasedCounter();
  }
}

/**
 * Estimate token usage for UI display
 */
export function estimateTokenUsage(
  messages: Message[],
  provider: ProviderType,
  model?: string
): number {
  const counter = getTokenCounter(provider, model);
  return counter.countMessageTokens(messages);
}

/**
 * Get detailed context window status
 */
export function getContextWindowStatus(
  systemPrompt: string,
  messages: Message[],
  modelContextSize: number,
  provider: ProviderType,
  model?: string
): {
  totalTokens: number;
  systemTokens: number;
  messageTokens: number;
  fits: boolean;
  remainingTokens: number;
} {
  const counter = getTokenCounter(provider, model);
  
  const systemTokens = counter.countTokens(systemPrompt);
  const messageTokens = counter.countMessageTokens(messages);
  const totalTokens = systemTokens + messageTokens;
  
  return {
    totalTokens,
    systemTokens,
    messageTokens,
    fits: totalTokens <= modelContextSize,
    remainingTokens: modelContextSize - totalTokens
  };
}
