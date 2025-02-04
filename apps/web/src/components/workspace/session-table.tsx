'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Session } from '@mandrake/types'

interface Props {
    sessions: Session[]
}

export function SessionTable({ sessions }: Props) {
    const router = useRouter()

    const handleNewSession = async () => {
        const response = await fetch('/api/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })

        if (!response.ok) {
            throw new Error('Failed to create session')
        }

        const session = await response.json()
        router.push(`/session/${session.id}`)
    }

    const sortedSessions = useMemo(() => {
        return [...sessions].sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
    }, [sessions])

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Sessions</CardTitle>
                <Button
                    size="sm"
                    onClick={handleNewSession}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    New Session
                </Button>
            </CardHeader>
            <CardContent>
                <div className="relative overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Last Message</th>
                                <th className="px-6 py-3">Messages</th>
                                <th className="px-6 py-3">Created</th>
                                <th className="px-6 py-3">Last Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedSessions.map((session) => (
                                <tr
                                    key={session.id}
                                    className="bg-white border-b hover:bg-gray-50 cursor-pointer"
                                    onClick={() => router.push(`/session/${session.id}`)}
                                >
                                    <td className="px-6 py-4">
                                        {session.rounds[session.rounds.length - 1]?.request.content || '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {session.rounds.length}
                                    </td>
                                    <td className="px-6 py-4">
                                        {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                                    </td>
                                    <td className="px-6 py-4">
                                        {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
                                    </td>
                                </tr>
                            ))}
                            {sessions.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                                        No sessions found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}