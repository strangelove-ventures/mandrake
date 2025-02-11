import { ServerTestConfig } from './types';
import { gitServerConfig } from './git';
import { filesystemServerConfig } from './filesystem';
import { fetchServerConfig } from './fetch';

export const serverConfigs: Record<string, ServerTestConfig> = {
    'git': gitServerConfig,
    'filesystem': filesystemServerConfig,
    'fetch': fetchServerConfig,
};

export * from './types';
