'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useWorkspaceStore } from '@/lib/stores/workspace'
import { ServerCard } from './server-card'

export function MCPServerStatus() {
    const [refreshing, setRefreshing] = useState(false)
    const { currentWorkspace, serverStatuses, refreshServerStatuses } = useWorkspaceStore()

    useEffect(() => {
        refreshServerStatuses()
        const interval = setInterval(refreshServerStatuses, 5000)
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

    if (!currentWorkspace?.config?.tools?.tools) return null

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
                    {refreshing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Refresh
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {currentWorkspace.config.tools.tools.map((tool) => (
                        <ServerCard
                            key={tool.id}
                            config={tool}
                            status={serverStatuses[tool.id] || 'initializing'}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}