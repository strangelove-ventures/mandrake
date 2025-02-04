// apps/web/src/components/shared/tools/ServerCard.tsx
import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'
import { useWorkspaceStore } from '@/lib/stores/workspace'
import { ServerConfig, Tool } from '@mandrake/types'
import { ToolSelector } from './ToolSelector'

interface ServerCardProps {
    config: ServerConfig
    status: string
    onToolSelect?: (tool: Tool) => void
}

export function ServerCard({ config, status, onToolSelect }: ServerCardProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [tools, setTools] = useState<Tool[]>([])
    const [loading, setLoading] = useState(false)
    const { currentWorkspace } = useWorkspaceStore()

    const loadTools = async () => {
        setLoading(true)
        try {
            const response = await fetch(`/api/workspace/${currentWorkspace?.id}/tools/${config.id}`)
            const data = await response.json()
            setTools(data.tools)
        } catch (error) {
            console.error('Failed to load tools:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleToolSelect = (tool: Tool) => {
        if (onToolSelect) {
            onToolSelect(tool)
            setIsOpen(false)
        }
    }

    return (
        <>
            <div
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                onClick={() => {
                    setIsOpen(true)
                    loadTools()
                }}
            >
                <div className="flex items-center gap-2">
                    <Badge variant="outline">{config.id}</Badge>
                    <Badge variant={status === 'ready' ? 'default' : 'secondary'}>
                        {status}
                    </Badge>
                </div>
            </div>

            <Dialog
                open={isOpen}
                onOpenChange={(open) => {
                    setIsOpen(open)
                }}
            >
                <DialogContent className="max-h-[80vh] max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            Available Tools - {config.id}
                        </DialogTitle>
                    </DialogHeader>

                    <ScrollArea className="h-[60vh]">
                        {loading ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : (
                            <ToolSelector
                                tools={tools}
                                onSelect={handleToolSelect}
                            />
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </>
    )
}