// apps/web/src/components/workspace/dynamic-context/DynamicContextCard.tsx
'use client'

import { useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Clock, Trash2 } from 'lucide-react'
import { useWorkspaceStore } from '@/lib/stores/workspace'
import type { DynamicContextMethodConfig } from '@mandrake/types'

interface Props {
    config: DynamicContextMethodConfig
}

export function DynamicContextCard({ config }: Props) {
    const [showDelete, setShowDelete] = useState(false)
    const { currentWorkspace, removeDynamicContext } = useWorkspaceStore()

    const handleDelete = async () => {
        if (!currentWorkspace) return
        await removeDynamicContext(currentWorkspace.id, config.id)
        setShowDelete(false)
    }

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{config.methodName}</h3>
                            <Badge variant={config.refresh.enabled ? "default" : "secondary"}>
                                {config.refresh.enabled ? "Auto" : "Manual"}
                            </Badge>
                            {config.tokenCount && (
                                <Badge variant="outline">
                                    {config.tokenCount} tokens
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-gray-500">Server: {config.serverId}</p>
                        {config.lastExecuted && (
                            <div className="flex items-center text-sm text-gray-500">
                                <Clock className="mr-1 h-3 w-3" />
                                Last run: {new Date(config.lastExecuted).toLocaleString()}
                            </div>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowDelete(true)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>

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
        </Card>
    )
}