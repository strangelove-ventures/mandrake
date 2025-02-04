import { Badge } from '@/components/ui/badge'
import { ServerConfig } from '@mandrake/types'

interface ServerStatusCardProps {
    config: ServerConfig
    status: string
}

export function ServerStatusCard({ config, status }: ServerStatusCardProps) {
    return (
        <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-2">
                <Badge variant="outline">{config.id}</Badge>
                <Badge variant={status === 'ready' ? 'default' : 'secondary'}>
                    {status}
                </Badge>
            </div>
        </div>
    )
}