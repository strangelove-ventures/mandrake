import { z } from 'zod';

// Context type that FastMCP provides to tools
export interface Context {
  // Add any context fields FastMCP provides
}

// Content types that match FastMCP's expectations
export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image';
  data: string;  // Changed from imageData to data to match FastMCP
  mimeType: string;
}

export type Content = TextContent | ImageContent;

export interface ContentResult {
  content: Content[];
}

// Tool type that matches FastMCP's expectations
export interface Tool<T extends z.ZodType> {
  name: string;
  description: string;
  parameters: T;
  execute: (args: z.infer<T>, context: Context) => Promise<string | ContentResult | TextContent | ImageContent>;
}
