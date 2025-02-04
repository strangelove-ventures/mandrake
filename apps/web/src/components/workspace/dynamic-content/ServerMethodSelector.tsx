// apps/web/src/components/workspace/dynamic-context/ServerMethodSelector.tsx
'use client'

import { useState, useEffect } from 'react'
import { useWorkspaceStore } from '@/lib/stores/workspace'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'

interface ToolMethod {
    name: string;
    description?: string;
    inputSchema?: any;
}

interface Props {
    onSelect: (serverId: string, method: string) => void
}

export function ServerMethodSelector({ onSelect }: Props) {
    const { currentWorkspace } = useWorkspaceStore()
    const [selectedServer, setSelectedServer] = useState<string | null>(null)
    const [methods, setMethods] = useState<ToolMethod[]>([])

    // Fetch methods when server is selected
    useEffect(() => {
        if (!selectedServer) {
            setMethods([])
            return
        }

        fetch(`/api/workspace/${currentWorkspace?.id}/tools/${selectedServer}`)
            .then(res => res.json())
            .then(data => {
                // Ensure we get an array of method objects
                setMethods(data.tools || [])
            })
            .catch(console.error)
    }, [selectedServer, currentWorkspace?.id])

    // Get available servers from workspace config
    const servers = currentWorkspace?.config?.tools?.tools || []

    return (
        <div className="space-y-4">
            {!selectedServer ? (
                // Server selection
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                    {servers.map(server => (
                        <Card
                            key={server.id}
                            className="p-4 cursor-pointer hover:bg-gray-100"
                            onClick={() => setSelectedServer(server.id)}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">{server.name}</h3>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                // Method selection
                <div className="space-y-4">
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                        {methods.map(method => (
                            <Card
                                key={method.name} // Using method name as key
                                className="p-4 cursor-pointer hover:bg-gray-100"
                                onClick={() => onSelect(selectedServer, method.name)}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-medium">{method.name}</span>
                                        {method.description && (
                                            <p className="text-sm text-gray-500">{method.description}</p>
                                        )}
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-400" />
                                </div>
                            </Card>
                        ))}
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => setSelectedServer(null)}
                    >
                        Back to Servers
                    </Button>
                </div>
            )}
        </div>
    )
}