// components/shared/tools/ToolMethod.tsx
import { Badge } from '@/components/ui/badge'
import { Tool } from '@mandrake/types'
import { MethodSchema } from './ToolDetails'

interface ToolMethodProps {
    tool: Tool
    method: string
    onBack?: () => void
    children?: React.ReactNode
}

export function ToolMethod({ tool, method, onBack, children }: ToolMethodProps) {
    const schema = tool.inputSchema as MethodSchema
    if (!schema) return null

    return (
        <div className="space-y-6">
            <div>
                <Badge variant="outline" className="mb-2">
                    {tool.name} / {method}
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

            {children}
        </div>
    )
}
