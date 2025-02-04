import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Tool } from '@mandrake/types'

interface ToolDetailsProps {
    tool: Tool
    onBack: () => void
    showInputs?: boolean // True for dynamic context, false for MCP server view
}

export interface MethodSchema {
    type: string
    properties: Record<string, {
        type: string
        description?: string
    }>
    required?: string[]
}

export function ToolDetails({ tool, onBack, showInputs = false }: ToolDetailsProps) {
    const schema = tool.inputSchema as MethodSchema

    return (
        <div className="space-y-6">
            <div>
                <Badge variant="outline" className="mb-2">
                    {tool.name}
                </Badge>
                {tool.description && (
                    <p className="text-sm text-gray-500 mt-2">
                        {tool.description}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <h4 className="text-sm font-medium">Parameters</h4>
                <div className="space-y-1">
                    {Object.entries(schema.properties || {}).map(([param, details]) => (
                        <div key={param} className="flex items-center gap-2">
                            <Badge variant="secondary">
                                {param}
                                {schema.required?.includes(param) && '*'}
                            </Badge>
                            <span className="text-sm text-gray-500">
                                ({details.type})
                            </span>
                            {details.description && (
                                <span className="text-sm text-gray-500">
                                    - {details.description}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <Button
                variant="outline"
                size="sm"
                onClick={onBack}
            >
                Back
            </Button>
        </div>
    )
}