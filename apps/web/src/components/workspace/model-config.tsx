// components/workspace/model-config.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useWorkspaceStore } from '@/lib/stores/workspace'
import { Loader2 } from 'lucide-react'
import type { ModelsConfig } from '@mandrake/types'

export function ModelConfig() {
    const { currentWorkspace, updateModels, loading } = useWorkspaceStore()
    const [config, setConfig] = useState<ModelsConfig>({
        provider: '',
        maxTokens: 16000,
        temperature: 0.7,
        baseURL: '',
        apiKey: ''
    })

    useEffect(() => {
        if (currentWorkspace?.config?.models) {
            setConfig(currentWorkspace.config.models)
        }
    }, [currentWorkspace?.config?.models])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentWorkspace?.id) return

        try {
            await updateModels(currentWorkspace.id, config)
        } catch (error) {
            console.error('Failed to update model config:', error)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Model Configuration</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Provider</Label>
                        <Input
                            value={config.provider}
                            onChange={e => setConfig(prev => ({ ...prev, provider: e.target.value }))}
                            placeholder="anthropic"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>API Key</Label>
                        <Input
                            type="password"
                            value={config.apiKey || ''}
                            onChange={e => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                            placeholder="sk-..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Base URL (Optional)</Label>
                        <Input
                            value={config.baseURL || ''}
                            onChange={e => setConfig(prev => ({ ...prev, baseURL: e.target.value }))}
                            placeholder="https://api.anthropic.com"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Max Tokens</Label>
                            <Input
                                type="number"
                                value={config.maxTokens}
                                onChange={e => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                                min="1"
                                max="100000"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Temperature</Label>
                            <Input
                                type="number"
                                value={config.temperature}
                                onChange={e => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                                step="0.1"
                                min="0"
                                max="2"
                            />
                        </div>
                    </div>

                    <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save Changes
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}