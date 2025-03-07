// Re-export from utils package
import type { Message } from '@mandrake/utils/src/common-types';
import type { 
  MessageStream,
  MessageStreamChunk,
  TextChunk,
  UsageChunk,
  ProviderImplConfig as ProviderConfig
} from '@mandrake/utils/src/types/provider';

// Re-export for backward compatibility
export type { Message, MessageStream, MessageStreamChunk, TextChunk, UsageChunk, ProviderConfig };