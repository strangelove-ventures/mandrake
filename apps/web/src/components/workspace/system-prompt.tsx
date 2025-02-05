import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useWorkspaceStore } from '@/lib/stores/workspace'
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react'

interface Props {
    className?: string
}

export function SystemPromptEditor({ className }: Props) {
    const [prompt, setPrompt] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const { currentWorkspace, updateSystemPrompt } = useWorkspaceStore()

    // Sync with workspace config
    useEffect(() => {
        if (currentWorkspace?.config?.systemPrompt) {
            setPrompt(currentWorkspace.config.systemPrompt)
        }
    }, [currentWorkspace?.config?.systemPrompt])

    // Handle save
    const handleSave = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!currentWorkspace?.id) return

        setIsSaving(true)
        try {
            await updateSystemPrompt(currentWorkspace.id, prompt)
        } catch (error) {
            console.error('Failed to save system prompt:', error)
            // Could add toast notification here
        } finally {
            setIsSaving(false)
        }
    }

    if (!currentWorkspace) return null

    return (
        <Card className={className}>
            <CardHeader
                className="flex flex-row items-center justify-between cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <CardTitle>System Prompt</CardTitle>
                </div>
                <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Changes
                </Button>
            </CardHeader>
            {isExpanded && (
                <CardContent>
                    <div className="space-y-4">
                        <Textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Enter system prompt..."
                            className="font-mono whitespace-pre overflow-x-auto"
                            rows={10}
                        />
                    </div>
                </CardContent>
            )}
        </Card>
    )
}