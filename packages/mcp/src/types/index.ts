export enum ServerStatus {
  STARTING = 'starting',
  READY = 'ready',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error'
}

export interface ContainerIdentifier {
  workspaceId: string;    // Workspace ID
  serverId: string;       // Server ID from config
  timestamp: string;      // Compact timestamp (YYYYMMDDHHMMSS)
}

export function formatContainerName(id: ContainerIdentifier): string {
  return `mandrake-${id.workspaceId}-${id.serverId}-${id.timestamp}`;
}

export function parseContainerName(name: string): ContainerIdentifier | null {
  const match = name.match(/^mandrake-([^-]+)-([^-]+)-(\d{14})$/);
  if (!match) return null;

  return {
    workspaceId: match[1],
    serverId: match[2],
    timestamp: match[3]
  };
}
