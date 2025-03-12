'use client';

import ModelsConfigShared from '@/components/shared/models';

interface ModelsConfigProps {
  workspaceId: string;
}

/**
 * Models Configuration component for workspace settings page 
 */
export default function ModelsConfig({ workspaceId }: ModelsConfigProps) {
  console.log(`Rendering workspace ModelsConfig with workspaceId: ${workspaceId}`);
  return <ModelsConfigShared isWorkspace={true} workspaceId={workspaceId} />;
}
