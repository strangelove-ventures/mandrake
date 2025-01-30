'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { useWorkspaceStore } from '@/lib/stores/workspace'

export function MCPServerStatus() {
    const [refreshing, setRefreshing] = useState(false)
    const { currentWorkspace, serverStatuses, refreshServerStatuses } = useWorkspaceStore()

    useEffect(() => {
        // Initial load
        refreshServerStatuses()

        const interval = setInterval(() => {
            refreshServerStatuses()
        }, 5000)

        return () => clearInterval(interval)
    }, [refreshServerStatuses])

    const handleRefresh = async () => {
        setRefreshing(true)
        try {
            await refreshServerStatuses()
        } finally {
            setRefreshing(false)
        }
    }

    console.log('Server statuses:', serverStatuses)
    console.log('Current workspace tools:', currentWorkspace?.config?.tools?.tools)


    if (!currentWorkspace?.config?.tools?.tools) {
        return null
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>MCP Servers</CardTitle>
                <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={refreshing}
                >
                    {refreshing && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Refresh
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {currentWorkspace.config.tools.tools.map((tool) => (
                        <div key={tool.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">{tool.id}</Badge>
                                <Badge 
                                    variant={serverStatuses[tool.id] === 'running' ? 'default' : 'secondary'}
                                >
                                    {serverStatuses[tool.id] || 'Unknown'}
                                </Badge>
                            </div>
                            <Button 
                                size="sm" 
                                variant="ghost"
                                disabled={serverStatuses[tool.id] === 'running'}
                            >
                                Restart
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}