// apps/web/src/components/shared/tools/ToolConfigurationForm.tsx
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { Tool } from '@mandrake/types'

interface Props {
    tool: Tool
    serverId: string
    onTest?: (result: any) => void
    onSubmit: (config: {
        params: Record<string, any>,
        refresh: {
            enabled: boolean,
            interval?: string
        }
    }) => Promise<void>
    isSubmitting?: boolean
    initialConfig?: {
        params: Record<string, any>,
        refresh: {
            enabled: boolean,
            interval?: string
        }
    }
}

export function ToolConfigurationForm({
    tool,
    serverId,
    onTest,
    onSubmit,
    isSubmitting = false,
    initialConfig
}: Props) {
    const [params, setParams] = useState<Record<string, any>>(initialConfig?.params || {})
    const [refreshEnabled, setRefreshEnabled] = useState(initialConfig?.refresh.enabled || false)
    const [refreshInterval, setRefreshInterval] = useState(initialConfig?.refresh.interval || '')
    const [testing, setTesting] = useState(false)
    const [testResult, setTestResult] = useState<any>(null)

    // Update form when initialConfig changes
    useEffect(() => {
        if (initialConfig) {
            setParams(initialConfig.params)
            setRefreshEnabled(initialConfig.refresh.enabled)
            setRefreshInterval(initialConfig.refresh.interval || '')
        }
    }, [initialConfig])

    const schema = tool.inputSchema as {
        type: string
        properties: Record<string, {
            type: string
            description?: string
        }>
        required?: string[]
    }

    const handleParamChange = (name: string, value: string) => {
        setParams(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleTest = async () => {
        setTesting(true)
        try {
            // Implementation of test logic
            const result = { success: true, data: params }
            setTestResult(result)
            onTest?.(result)
        } catch (error) {
            console.error('Test failed:', error)
        } finally {
            setTesting(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onSubmit({
            params,
            refresh: {
                enabled: refreshEnabled,
                interval: refreshEnabled ? refreshInterval : undefined
            }
        })
    }

    if (!schema?.properties) {
        return <div>Invalid tool schema</div>
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                {Object.entries(schema.properties).map(([param, details]) => (
                    <div key={param} className="space-y-2">
                        <Label htmlFor={param}>
                            {param}
                            {schema.required?.includes(param) && <span className="text-red-500">*</span>}
                        </Label>
                        {details.description && (
                            <p className="text-sm text-muted-foreground">{details.description}</p>
                        )}
                        <Input
                            id={param}
                            type={details.type === 'number' ? 'number' : 'text'}
                            value={params[param] || ''}
                            onChange={e => handleParamChange(param, e.target.value)}
                            required={schema.required?.includes(param)}
                            placeholder={`Enter ${details.type}`}
                        />
                    </div>
                ))}
            </div>

            <div className="space-y-4">
                <div className="flex items-center space-x-2">
                    <Switch
                        id="auto-refresh"
                        checked={refreshEnabled}
                        onCheckedChange={setRefreshEnabled}
                    />
                    <Label htmlFor="auto-refresh">Auto Refresh</Label>
                </div>

                {refreshEnabled && (
                    <div className="space-y-2">
                        <Label htmlFor="interval">Refresh Interval</Label>
                        <Input
                            id="interval"
                            placeholder="e.g. 5m, 1h"
                            value={refreshInterval}
                            onChange={e => setRefreshInterval(e.target.value)}
                        />
                    </div>
                )}
            </div>

            {testResult && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <h3 className="font-medium text-sm">Test Result</h3>
                            <pre className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap">
                                {JSON.stringify(testResult.result, null, 2)}
                            </pre>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="flex justify-end space-x-2">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={handleTest}
                    disabled={testing || isSubmitting}
                >
                    {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Test
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                </Button>
            </div>
        </form>
    )
}