// apps/web/src/app/workspace/[id]/page.tsx 
'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useWorkspaceStore } from '@/lib/stores/workspace'

// Components
import { MCPServerStatus } from '@/components/workspace/mcp-status'
import { SystemPromptEditor } from '@/components/workspace/system-prompt'
import { ContextFiles } from '@/components/workspace/context-files'
import { ModelConfig } from '@/components/workspace/model-config'
import { DynamicContextList } from '@/components/workspace/dynamic-content/DynamicContentList'

export default function WorkspacePage() {
    const { id } = useParams()
    const { currentWorkspace, loadWorkspace } = useWorkspaceStore()

    useEffect(() => {
        if (id) {
            loadWorkspace(id as string)
        }
    }, [id, loadWorkspace])

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold">{currentWorkspace?.name}</h1>
                    {currentWorkspace?.description && (
                        <p className="text-muted-foreground mt-2">{currentWorkspace.description}</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* MCP Server Status */}
                <MCPServerStatus />

                {/* Model Configuration */}
                <ModelConfig />

                {/* System Prompt */}
                <SystemPromptEditor className="lg:col-span-2" />

                {/* Dynamic Context */}
                <DynamicContextList className="lg:col-span-2" />

                {/* Context Files */}
                <ContextFiles className="lg:col-span-2" />
            </div>
        </div>
    )
}