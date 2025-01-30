import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Tool } from '@mandrake/types'

interface ToolsListProps {
    tools: Tool[]
    onSelectTool: (tool: Tool) => void
}

export function ToolsList({ tools, onSelectTool }: ToolsListProps) {
    if (!tools?.length) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                No tools available
            </div>
        )
    }
    
    return (
        <div className="grid gap-2 p-4">
            {tools.map(tool => (
                <div
                    key={tool.name}
                    className="p-4 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => onSelectTool(tool)}
                >
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium">{tool.name}</h3>
                        <Badge variant="secondary">Details →</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        {tool.description}
                    </p>
                </div>
            ))}
        </div>
    )
}