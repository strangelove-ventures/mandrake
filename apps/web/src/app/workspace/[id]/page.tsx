// apps/web/src/app/workspace/[id]/page.tsx 
'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useWorkspaceStore } from '@/lib/stores/workspace'

// Components
import { SessionTable } from '@/components/workspace/session-table'
import { MCPServerStatus } from '@/components/workspace/mcp-status'
import { DynamicContextList } from '@/components/workspace/dynamic-content/DynamicContentList'
import { ContextFiles } from '@/components/workspace/context-files'
import { SystemPromptEditor } from '@/components/workspace/system-prompt'
import { ModelConfig } from '@/components/workspace/model-config'

export default function WorkspacePage() {
    const { id } = useParams()
    const { currentWorkspace, sessions, loadWorkspace } = useWorkspaceStore()

    useEffect(() => {
        if (id) {
            loadWorkspace(id as string)
        }
    }, [id, loadWorkspace])

    if (!currentWorkspace) {
        return null // Or loading state
    }

    return (
        <div className="container mx-auto p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold">{currentWorkspace.name}</h1>
                    {currentWorkspace.description && (
                        <p className="text-muted-foreground mt-2">{currentWorkspace.description}</p>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex gap-6">
                {/* Left side - Sessions (2/3) */}
                <div className="w-2/3">
                    <SessionTable sessions={sessions} />
                </div>

                {/* Right side - Config (1/3) */}
                <div className="w-1/3 space-y-6">
                    <MCPServerStatus />
                    <DynamicContextList />
                    <ContextFiles />
                    <SystemPromptEditor />
                    <ModelConfig />
                </div>
            </div>
        </div>
    )
}
