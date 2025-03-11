'use client';

import PromptConfigShared from '@/components/shared/prompt';

interface PromptConfigProps {
  workspaceId: string;
}

/**
 * Prompt Configuration component for workspace settings page 
 */
export default function PromptConfig({ workspaceId }: PromptConfigProps) {
  return <PromptConfigShared isWorkspace={true} workspaceId={workspaceId} />;
}
