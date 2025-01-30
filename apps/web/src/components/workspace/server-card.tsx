import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'
import { useWorkspaceStore } from '@/lib/stores/workspace'
import { ServerConfig, Tool } from '@mandrake/types'
import { ToolDetails } from './tool-details'
import { ToolsList } from './tools-list'

interface ServerCardProps {
    config: ServerConfig
    status: string
}

export function ServerCard({ config, status }: ServerCardProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
    const [tools, setTools] = useState<Tool[]>([])
    const [loading, setLoading] = useState(false)
    const { currentWorkspace } = useWorkspaceStore()

    const loadTools = async () => {
        setLoading(true)
        try {
            const response = await fetch(`/api/workspace/${currentWorkspace?.id}/tools/${config.id}`)
            const data = await response.json()
            console.log('Loaded tools:', data)
            setTools(data.tools)
        } catch (error) {
            console.error('Failed to load tools:', error)
        } finally {
            setLoading(false)
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
                    if (!open) setSelectedTool(null)
                }}
            >
                <DialogContent className="max-h-[80vh] max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedTool ? selectedTool.name : config.id}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedTool ? 'Tool details and usage' : 'Available tools from this server'}
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="h-[60vh]">
                        {loading ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : selectedTool ? (
                            <ToolDetails
                                tool={selectedTool}
                                config={config}
                                onBack={() => setSelectedTool(null)}
                            />
                        ) : (
                            <ToolsList
                                tools={tools}
                                onSelectTool={setSelectedTool}
                            />
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </>
    )
}