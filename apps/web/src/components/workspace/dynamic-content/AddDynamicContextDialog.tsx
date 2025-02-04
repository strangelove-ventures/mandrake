// apps/web/src/components/workspace/dynamic-content/AddDynamicContextDialog.tsx
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useWorkspaceStore } from '@/lib/stores/workspace'
import { ServerCard } from '@/components/shared/tools/ServerCard'
import { ToolConfigurationForm } from '@/components/shared/tools/ToolConfigurationForm'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import type { Tool } from '@mandrake/types'

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
}

type ViewState = 'servers' | 'configure'

export function AddDynamicContextDialog({ open, onOpenChange }: Props) {
    const { currentWorkspace, serverStatuses, addDynamicContext } = useWorkspaceStore()
    const [viewState, setViewState] = useState<ViewState>('servers')
    const [selectedServer, setSelectedServer] = useState<string | null>(null)
    const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const servers = currentWorkspace?.config?.tools?.tools || []

    const handleToolSelect = (serverId: string, tool: Tool) => {
        setSelectedServer(serverId)
        setSelectedTool(tool)
        setViewState('configure')
    }

    const handleBack = () => {
        setViewState('servers')
        setSelectedTool(null)
        setSelectedServer(null)
    }

    const handleSubmit = async (config: {
        params: Record<string, any>,
        refresh: {
            enabled: boolean,
            interval?: string
        }
    }) => {
        if (!currentWorkspace || !selectedServer || !selectedTool) return

        setIsSubmitting(true)
        try {
            await addDynamicContext(currentWorkspace.id, {
                // id: `${selectedServer}-${selectedTool.name}-${Date.now()}`, // Generate unique ID
                serverId: selectedServer,
                methodName: selectedTool.name,
                params: config.params,
                refresh: config.refresh,
                // tokenCount: null, // Will be updated after first execution
                // lastExecuted: null,
            })
            onOpenChange(false)
        } catch (error) {
            console.error('Failed to add dynamic context:', error)
            // TODO: Show error toast
        } finally {
            setIsSubmitting(false)
        }
    }

    const renderContent = () => {
        switch (viewState) {
            case 'servers':
                return (
                    <div className="space-y-4">
                        {servers.map((server) => (
                            <ServerCard
                                key={server.id}
                                config={server}
                                status={serverStatuses[server.id] || 'initializing'}
                                onToolSelect={(tool) => handleToolSelect(server.id, tool)}
                            />
                        ))}
                    </div>
                )

            case 'configure':
                return selectedTool && selectedServer && (
                    <ToolConfigurationForm
                        tool={selectedTool}
                        serverId={selectedServer}
                        onSubmit={handleSubmit}
                        isSubmitting={isSubmitting}
                    />
                )
        }
    }

    const titles = {
        servers: 'Select a Tool',
        configure: `Configure ${selectedTool?.name || 'Tool'}`
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {titles[viewState]}
                    </DialogTitle>
                </DialogHeader>

                {viewState !== 'servers' && (
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        className="mb-4"
                        disabled={isSubmitting}
                    >
                        Back
                    </Button>
                )}

                {renderContent()}
            </DialogContent>
        </Dialog>
    )
}