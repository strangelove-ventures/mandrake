// apps/web/src/components/workspace/dynamic-context/TestResultView.tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'

interface Props {
    result: any
}

export function TestResultView({ result }: Props) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="space-y-2">
                    <h3 className="font-medium text-sm">Test Result</h3>
                    <div className="max-h-[40vh] overflow-y-auto">
                        <pre className="bg-gray-100 p-4 rounded-md text-sm whitespace-pre-wrap">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </div>
                    {result.tokenCount !== undefined && (
                        <p className="text-sm text-gray-500">
                            Token Count: {result.tokenCount}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}