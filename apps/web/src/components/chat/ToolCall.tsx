import React from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Wrench } from 'lucide-react';

interface ToolCallProps {
    name: string;
    input: any;
    result?: any;
    serverId?: string;
}

const ToolCall: React.FC<ToolCallProps> = ({ name, input, result, serverId }) => {
    return (
        <Card className="bg-blue-50 dark:bg-blue-900/20">
            <CardHeader className="flex flex-row items-center gap-2 py-2">
                <Wrench className="h-4 w-4" />
                <h4 className="font-medium">{name}</h4>
                {serverId && (
                    <span className="text-xs text-gray-500 ml-auto">{serverId}</span>
                )}
            </CardHeader>
            <CardContent className="space-y-2 py-2">
                <div>
                    <div className="text-sm font-medium text-gray-500">Input:</div>
                    <pre className="mt-1 p-2 text-sm bg-white/50 dark:bg-black/50 rounded overflow-x-auto">
                        {JSON.stringify(input, null, 2)}
                    </pre>
                </div>
                {result && (
                    <div>
                        <div className="text-sm font-medium text-gray-500">Result:</div>
                        <pre className="mt-1 p-2 text-sm bg-white/50 dark:bg-black/50 rounded overflow-x-auto">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ToolCall;