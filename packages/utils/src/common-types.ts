/**
 * Common types shared across packages to avoid circular dependencies
 */

/**
 * Message format for conversations with AI models
 */
export interface Message {
  role: 'user' | 'assistant';
  content: string;
}
