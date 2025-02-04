'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useWorkspaceStore } from '@/lib/stores/workspace'
import { AddDynamicContextDialog } from './AddDynamicContextDialog'
import { DynamicContextCard } from './DynamicContextCard'
import type { DynamicContextMethodConfig } from '@mandrake/types'

interface Props {
    className?: string
}   
export function DynamicContextList({ className }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false)
    const { currentWorkspace } = useWorkspaceStore()

    if (!currentWorkspace?.config?.context) return null

    const { dynamicContexts = [] } = currentWorkspace.config.context

    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Dynamic Context</CardTitle>
                <Button
                    size="sm"
                    onClick={() => setDialogOpen(true)}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Context
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {dynamicContexts.map((context) => (
                        <DynamicContextCard
                            key={context.id}
                            config={context}
                        />
                    ))}
                </div>
            </CardContent>
            <AddDynamicContextDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </Card>
    )
}
