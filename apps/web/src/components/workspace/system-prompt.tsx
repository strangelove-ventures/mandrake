// components/workspace/system-prompt.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useWorkspaceStore } from '@/lib/stores/workspace'

interface Props {
    className?: string
}

export function SystemPromptEditor({ className }: Props) {
    const [prompt, setPrompt] = useState('')
    const { currentWorkspace, updateSystemPrompt } = useWorkspaceStore()

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle>System Prompt</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={10}
                    />
                    <Button>Save Changes</Button>
                </div>
            </CardContent>
        </Card>
    )
}