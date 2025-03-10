'use client';

import ToolsConfigComponent from '@/components/shared/tools';

interface WorkspaceToolsConfigProps {
  workspaceId: string;
}

/**
 * Workspace Tools Configuration component
 * This is a thin wrapper around the shared ToolsConfig component
 */
export default function WorkspaceToolsConfig({ workspaceId }: WorkspaceToolsConfigProps) {
  return <ToolsConfigComponent isWorkspace workspaceId={workspaceId} />;
}
