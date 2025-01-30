import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useWorkspaceStore } from '@/lib/stores/workspace'
import { Loader2, Settings } from 'lucide-react'
import type { ModelsConfig } from '@mandrake/types'

const PROVIDERS = [
    {
        id: 'anthropic',
        name: 'Anthropic (Claude)',
        defaults: {
            maxTokens: 4096,
            temperature: 0.7,
            baseURL: undefined,
            apiKey: ''
        }
    },
    {
        id: 'deepseek',
        name: 'Deepseek',
        defaults: {
            maxTokens: 4096,
            temperature: 0.7,
            baseURL: 'https://api.deepseek.com/v1',
            apiKey: ''
        }
    }
] as const

function ModelEditForm({ config, onSubmit, loading }: {
    config: ModelsConfig
    onSubmit: (config: ModelsConfig) => Promise<void>
    loading: boolean
}) {
    const [formData, setFormData] = useState(config)

    const handleProviderChange = (providerId: string) => {
        const provider = PROVIDERS.find(p => p.id === providerId)
        if (!provider) return

        setFormData({
            ...provider.defaults,
            provider: providerId,
            apiKey: formData.apiKey // Preserve existing API key
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onSubmit(formData)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                    value={formData.provider}
                    onValueChange={handleProviderChange}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select a provider" />
                    </SelectTrigger>
                    <SelectContent>
                        {PROVIDERS.map(provider => (
                            <SelectItem key={provider.id} value={provider.id}>
                                {provider.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                    type="password"
                    value={formData.apiKey || ''}
                    onChange={e => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder={formData.provider === 'anthropic' ? 'sk-...' : 'ds-...'}
                />
            </div>

            <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
            </Button>
        </form>
    )
}

export function ModelConfig() {
    const [editOpen, setEditOpen] = useState(false)
    const { currentWorkspace, updateModels, loading } = useWorkspaceStore()
    const modelConfig = currentWorkspace?.config?.models

    const handleSubmit = async (config: ModelsConfig) => {
        if (!currentWorkspace?.id) return
        try {
            await updateModels(currentWorkspace.id, config)
            setEditOpen(false)
        } catch (error) {
            console.error('Failed to update model config:', error)
        }
    }

    const currentProvider = PROVIDERS.find(p => p.id === modelConfig?.provider)

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Model Configuration</span>
                    <Dialog open={editOpen} onOpenChange={setEditOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Settings className="h-4 w-4 mr-2" />
                                Edit
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit Model Configuration</DialogTitle>
                            </DialogHeader>
                            {modelConfig && (
                                <ModelEditForm
                                    config={modelConfig}
                                    onSubmit={handleSubmit}
                                    loading={loading}
                                />
                            )}
                        </DialogContent>
                    </Dialog>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                        {currentProvider?.name || 'No provider set'}
                    </Badge>
                    {modelConfig?.apiKey && (
                        <Badge variant="secondary">
                            Configured
                        </Badge>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}