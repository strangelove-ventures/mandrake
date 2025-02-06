import { ServerConfig } from '@mandrake/types';

export function createProductionConfigs(workspacePath: string): ServerConfig[] {
  const timestamp = Date.now();
  
  return [
    // Filesystem server
    {
      id: 'filesystem',
      name: `filesystem-${timestamp}`,
      image: 'ghcr.io/strangelove-ventures/mcp/filesystem:latest',  // TODO: use production image
      command: ['/workspace'],
      execCommand: ['/app/dist/index.js', '/workspace'],
      volumes: [{
        source: workspacePath,
        target: '/workspace',
        mode: 'rw'
      }]
    },

    // Git server
    {
      id: 'git',
      name: `git-${timestamp}`,
      image: 'ghcr.io/strangelove-ventures/mcp/git:latest',  // TODO: use production image
      command: [],
      execCommand: ['mcp-server-git'],
      volumes: [{
        source: workspacePath,
        target: '/workspace',
        mode: 'rw'
      }]
    },

    // Fetch server
    {
      id: 'fetch',
      name: `fetch-${timestamp}`,
      image: 'ghcr.io/strangelove-ventures/mcp/fetch:latest',  // TODO: use production image
      command: [],
      execCommand: ['mcp-server-fetch']
      // No volumes needed for fetch server
    }
  ];
}