import { BaseProvider } from '../providers';

export interface SessionConfig {
  workspaceId: string;
  systemPrompt: string;
  provider: BaseProvider;
}

export * from './coordinator';