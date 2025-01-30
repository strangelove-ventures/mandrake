// components/workspace/context-files.tsx
'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Upload } from 'lucide-react'

interface Props {
    className?: string
}

export function ContextFiles({ className }: Props) {
    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Context Files</CardTitle>
                <Button size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Files
                </Button>
            </CardHeader>
            <CardContent>
                {/* File list/grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card className="p-4 hover:shadow-md cursor-pointer">
                        <FileText className="w-8 h-8 mb-2" />
                        <p className="text-sm font-medium">example.md</p>
                        <p className="text-xs text-muted-foreground">12KB</p>
                    </Card>
                </div>
            </CardContent>
        </Card>
    )
}