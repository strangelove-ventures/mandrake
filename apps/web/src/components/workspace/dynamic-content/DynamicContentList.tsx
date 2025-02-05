'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { useWorkspaceStore } from '@/lib/stores/workspace'
import { AddDynamicContextDialog } from './AddDynamicContextDialog'
import { DynamicContextCard } from './DynamicContextCard'

export function DynamicContentList() {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const { currentWorkspace } = useWorkspaceStore()

    const dynamicContexts = currentWorkspace?.config?.context?.dynamicContexts || []

    return (
        <Card>
            <CardHeader
                className="flex flex-row items-center justify-between cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <CardTitle>Dynamic Context</CardTitle>
                </div>
                <Button
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation()
                        setDialogOpen(true)
                    }}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Context
                </Button>
            </CardHeader>
            {isExpanded && (
                <CardContent>
                    {dynamicContexts.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                            No dynamic contexts configured
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {dynamicContexts.map((context) => (
                                <DynamicContextCard
                                    key={context.id}
                                    config={context}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            )}
            <AddDynamicContextDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </Card>
    )
}