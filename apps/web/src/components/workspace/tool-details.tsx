import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tool } from '@mandrake/types'
import { ServerConfig } from '@mandrake/types'

interface ToolDetailsProps {
    tool: Tool
    config: ServerConfig
    onBack: () => void
}

export function ToolDetails({ tool, config, onBack }: ToolDetailsProps) {
    return (
        <div className="space-y-6 p-4">
            <div>
                <Badge variant="outline" className="mb-2">
                    {tool.name}
                </Badge>
                {tool.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                        {tool.description}
                    </p>
                )}
            </div>

            <Button
                variant="outline"
                size="sm"
                onClick={onBack}
            >
                Back
            </Button>

            {/* Request Format */}
            <div>
                <h4 className="text-sm font-medium mb-2">Request Format</h4>
                <pre className="text-sm bg-muted p-4 rounded-md overflow-auto">
                    {JSON.stringify((tool.inputSchema || {}), null, 2)}
                </pre>
            </div>
        </div>
    )
}