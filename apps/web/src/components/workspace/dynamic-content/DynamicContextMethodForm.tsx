// apps/web/src/components/workspace/dynamic-content/DynamicContextMethodForm.tsx
'use client'

import { useState } from 'react'
import { useWorkspaceStore } from '@/lib/stores/workspace'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tool } from '@mandrake/types'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import { ToolDetails } from '@/components/shared/tools/ToolDetails'

interface Props {
    serverId: string
    method: string
    tool: Tool
    onBack: () => void
    onSubmit: (config: {
        params: Record<string, any>,
        refresh: {
            enabled: boolean,
            interval?: string
        }
    }) => Promise<void>
}

interface TestResult {
    result: any
    tokenCount?: number
}

interface SchemaProperty {
    type: string
    description?: string
}

interface MethodSchema {
    type: string
    properties: Record<string, SchemaProperty>
    required?: string[]
}

export function DynamicContextMethodForm({ serverId, method, tool, onBack, onSubmit }: Props) {
    const [params, setParams] = useState<Record<string, any>>({})
    const [refreshEnabled, setRefreshEnabled] = useState(false)
    const [refreshInterval, setRefreshInterval] = useState<string>('')
    const [testing, setTesting] = useState(false)
    const [testResult, setTestResult] = useState<TestResult | null>(null)
    const { currentWorkspace } = useWorkspaceStore()
    const schema = tool.inputSchema as MethodSchema

    // Get the method schema from the tool
    const paramFields = schema?.properties ?
        Object.entries(schema.properties).map(([name, inputSchema]) => ({
            name,
            type: inputSchema.type,
            required: schema.required?.includes(name) || false,
            description: inputSchema.description
        })) : []

    const handleParamChange = (name: string, value: string) => {
        setParams(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleTest = async () => {
        setTesting(true)
        try {
            const response = await fetch(`/api/workspace/${currentWorkspace?.id}/tools/${serverId}/${method}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            })

            if (!response.ok) {
                throw new Error('Failed to test method')
            }

            const result = await response.json()
            setTestResult(result)
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

    return (
        <div className="space-y-6">
            {/* Show tool details first */}
            <ToolDetails tool={tool} onBack={onBack} />

            {/* Configuration form */}
            {/* Parameter input fields */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    {Object.entries(schema.properties || {}).map(([param, details]) => (
                        <div key={param} className="space-y-2">
                            <Label htmlFor={param}>
                                {param}
                                {schema.required?.includes(param) && <span className="text-red-500">*</span>}
                            </Label>
                            {details.description && (
                                <p className="text-sm text-gray-500">{details.description}</p>
                            )}
                            <Input
                                id={param}
                                type={details.type === 'integer' ? 'number' : 'text'}
                                value={params[param] || ''}
                                onChange={e => handleParamChange(param, e.target.value)}
                                required={schema.required?.includes(param)}
                                placeholder={`Enter ${details.type}`}
                            />
                        </div>
                    ))}
                </div>

                <div className="space-y-4">
                    {paramFields.map(field => (
                        <div key={field.name} className="space-y-2">
                            <Label htmlFor={field.name}>
                                {field.name}
                                {field.required && <span className="text-red-500">*</span>}
                            </Label>
                            {field.description && (
                                <p className="text-sm text-gray-500">{field.description}</p>
                            )}
                            <Input
                                id={field.name}
                                value={params[field.name] || ''}
                                onChange={e => handleParamChange(field.name, e.target.value)}
                                required={field.required}
                                placeholder={`Enter ${field.type}`}
                            />
                        </div>
                    ))}
                </div>

                {/* Refresh Settings */}
                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Switch
                            checked={refreshEnabled}
                            onCheckedChange={setRefreshEnabled}
                        />
                        <Label>Auto Refresh</Label>
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

                {/* Test Result */}
                {testResult && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="space-y-2">
                                <h3 className="font-medium text-sm">Test Result</h3>
                                <div className="max-h-[40vh] overflow-y-auto">
                                    <pre className="bg-gray-100 p-4 rounded-md text-sm whitespace-pre-wrap">
                                        {JSON.stringify(testResult.result, null, 2)}
                                    </pre>
                                </div>
                                {testResult.tokenCount !== undefined && (
                                    <p className="text-sm text-gray-500">
                                        Token Count: {testResult.tokenCount}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Actions */}
                <div className="flex justify-between space-x-2">
                    <Button type="button" variant="outline" onClick={onBack}>
                        Back
                    </Button>
                    <div className="space-x-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleTest}
                            disabled={testing}
                        >
                            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Test
                        </Button>
                        <Button type="submit">Save</Button>
                    </div>
                </div>
            </form>
        </div>
    )
}