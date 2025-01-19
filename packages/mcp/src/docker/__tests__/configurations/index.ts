import { ServerTestConfig } from './types';
import { memoryServerConfig } from './memory';
import { gitServerConfig } from './git';
import { filesystemServerConfig } from './filesystem';
import { fetchServerConfig } from './fetch';

export const serverConfigs: Record<string, ServerTestConfig> = {
    'memory': memoryServerConfig,
    'git': gitServerConfig,
    'filesystem': filesystemServerConfig,
    'fetch': fetchServerConfig,
};

export * from './types';
