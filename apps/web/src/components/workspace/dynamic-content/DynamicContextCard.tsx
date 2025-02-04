// apps/web/src/components/workspace/dynamic-content/DynamicContextCard.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Eye, Trash2, PencilIcon, Loader2 } from 'lucide-react'
import { useWorkspaceStore } from '@/lib/stores/workspace'
import { ToolMethod } from '@/components/shared/tools/ToolMethod'
import { ToolConfigurationForm } from '@/components/shared/tools/ToolConfigurationForm'
import type { DynamicContextMethodConfig, Tool } from '@mandrake/types'

interface Props {
    config: DynamicContextMethodConfig
}

interface ToolResult {
    result: any
    tokenCount?: number
}

export function DynamicContextCard({ config }: Props) {
    const [showDelete, setShowDelete] = useState(false)
    const [showDetails, setShowDetails] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [toolResult, setToolResult] = useState<ToolResult | null>(null)
    const [tool, setTool] = useState<Tool | null>(null)
    const { currentWorkspace, removeDynamicContext, updateDynamicContext } = useWorkspaceStore()

    const loadToolAndResult = async () => {
        if (!currentWorkspace) return
        setLoading(true)
        try {
            // First get all tools for this server
            const toolsResponse = await fetch(`/api/workspace/${currentWorkspace.id}/tools/${config.serverId}`)
            const toolsData = await toolsResponse.json()

            // Find our specific tool
            const matchingTool = toolsData.tools.find((t: Tool) => t.name === config.methodName)
            if (!matchingTool) {
                throw new Error('Tool not found')
            }
            setTool(matchingTool)

            // Execute the tool with current params
            const resultResponse = await fetch(
                `/api/workspace/${currentWorkspace.id}/tools/${config.serverId}/${config.methodName}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config.params)
                }
            )
            const resultData = await resultResponse.json()
            setToolResult(resultData)
        } catch (error) {
            console.error('Failed to load tool and result:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!currentWorkspace) return
        await removeDynamicContext(currentWorkspace.id, config.id)
        setShowDelete(false)
    }

    const handleViewDetails = () => {
        setShowDetails(true)
        loadToolAndResult()
    }

    const handleUpdateConfig = async (newConfig: {
        params: Record<string, any>,
        refresh: {
            enabled: boolean,
            interval?: string
        }
    }) => {
        if (!currentWorkspace) return

        try {
            await updateDynamicContext(currentWorkspace.id, config.id, {
                ...config,
                ...newConfig
            })
            setIsEditing(false)
            loadToolAndResult() // Refresh the result with new params
        } catch (error) {
            console.error('Failed to update configuration:', error)
        }
    }

    return (
        <>
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{config.methodName}</h3>
                            <Badge variant="outline">{config.serverId}</Badge>
                        </div>
                        <div className="flex space-x-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleViewDetails}
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowDelete(true)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Details Dialog */}
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span>{config.methodName}</span>
                            <Button
                                variant="outline"
                                onClick={() => setIsEditing(!isEditing)}
                            >
                                <PencilIcon className="h-4 w-4 mr-2" />
                                Edit Configuration
                            </Button>
                        </DialogTitle>
                    </DialogHeader>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {isEditing && tool ? (
                                <ToolConfigurationForm
                                    tool={tool}
                                    serverId={config.serverId}
                                    initialConfig={{
                                        params: config.params,
                                        refresh: config.refresh
                                    }}
                                    onSubmit={handleUpdateConfig}
                                />
                            ) : (
                                <>
                                    {tool && (
                                        <div className="space-y-4">
                                            <ToolMethod
                                                tool={tool}
                                                method={config.methodName}
                                            />
                                            <div className="mt-6">
                                                <h4 className="text-sm font-medium mb-2">Current Configuration</h4>
                                                <pre className="bg-gray-100 p-4 rounded-md text-sm">
                                                    {JSON.stringify(config.params, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                    {toolResult && (
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-medium">Result</h4>
                                            <pre className="bg-gray-100 p-4 rounded-md text-sm max-h-96 overflow-auto">
                                                {JSON.stringify(toolResult.result, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Dynamic Context</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this dynamic context? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button variant="outline" onClick={() => setShowDelete(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}