// apps/web/src/components/shared/tools/ToolSelector.tsx
import React from 'react'
import { Card } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'
import type { Tool } from '@mandrake/types'

interface ToolSelectorProps {
    tools: Tool[]
    onSelect: (tool: Tool) => void
}

export function ToolSelector({ tools, onSelect }: ToolSelectorProps) {
    if (!tools?.length) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                No tools available for this server
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {tools.map(tool => (
                <Card
                    key={tool.name}
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => onSelect(tool)}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{tool.name}</h3>
                            {tool.description && (
                                <p className="text-sm text-muted-foreground truncate">
                                    {tool.description}
                                </p>
                            )}
                            {tool.inputSchema && (
                                <div className="flex gap-1 flex-wrap mt-1">
                                    {Object.keys(tool.inputSchema.properties || {}).map(param => (
                                        <span
                                            key={param}
                                            className="text-xs bg-accent-foreground/10 px-1.5 py-0.5 rounded-sm"
                                        >
                                            {param}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
                    </div>
                </Card>
            ))}
        </div>
    )
}