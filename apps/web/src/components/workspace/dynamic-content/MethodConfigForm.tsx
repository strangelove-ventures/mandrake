'use client'

import { useState } from 'react'
import { useWorkspaceStore } from '@/lib/stores/workspace'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { TestResultView } from './TestResultView'

interface Props {
    serverId: string
    method: string
    onSubmit: (params: Record<string, any>) => Promise<void>
    onBack: () => void
}

export function MethodConfigForm({ serverId, method, onSubmit, onBack }: Props) {
    const [params, setParams] = useState<Record<string, any>>({})
    const [testing, setTesting] = useState(false)
    const [testResult, setTestResult] = useState<any>(null)
    const { testDynamicContext } = useWorkspaceStore()

    // This would typically come from the server schema - for now hardcoding required fields
    const paramFields = [{
        name: 'path',
        type: 'string',
        required: true
    }]

    const handleParamChange = (name: string, value: string) => {
        setParams(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleTest = async () => {
        setTesting(true)
        try {
            const result = await testDynamicContext(serverId, method, params)
            setTestResult(result)
        } catch (error) {
            console.error('Test failed:', error)
            // TODO: Show error in UI
        } finally {
            setTesting(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onSubmit(params)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                {paramFields.map(field => (
                    <div key={field.name} className="space-y-2">
                        <Label htmlFor={field.name}>
                            {field.name}
                            {field.required && <span className="text-red-500">*</span>}
                        </Label>
                        <Input
                            id={field.name}
                            value={params[field.name] || ''}
                            onChange={e => handleParamChange(field.name, e.target.value)}
                            required={field.required}
                        />
                    </div>
                ))}
            </div>

            {testResult && (
                <TestResultView result={testResult} />
            )}

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
    )
}