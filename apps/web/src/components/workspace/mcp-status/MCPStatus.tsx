'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { useWorkspaceStore } from '@/lib/stores/workspace'
import { ServerStatusCard } from './ServerStatusCard'

export function MCPStatus() {
    const [refreshing, setRefreshing] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const { currentWorkspace, serverStatuses, refreshServerStatuses } = useWorkspaceStore()

    useEffect(() => {
        refreshServerStatuses()
        const interval = setInterval(refreshServerStatuses, 5000)
        return () => clearInterval(interval)
    }, [refreshServerStatuses])

    const handleRefresh = async (e: React.MouseEvent) => {
        e.stopPropagation()
        setRefreshing(true)
        try {
            await refreshServerStatuses()
        } finally {
            setRefreshing(false)
        }
    }

    const configuredServers = currentWorkspace?.config?.tools?.tools || []

    return (
        <Card>
            <CardHeader
                className="flex flex-row items-center justify-between cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <CardTitle>MCP Servers</CardTitle>
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={refreshing}
                >
                    {refreshing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Refresh
                </Button>
            </CardHeader>
            {isExpanded && (
                <CardContent>
                    {configuredServers.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                            No MCP servers configured
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {configuredServers.map((server) => (
                                <ServerStatusCard
                                    key={server.id}
                                    config={server}
                                    status={serverStatuses[server.id] || 'not started'}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    )
}