import ChatInterface from '@/components/chat/ChatInterface'

export default async function ChatPage({
    params
}: {
    params: Promise<{ sessionId: string }>
}) {
    const { sessionId } = await params
    return <ChatInterface sessionId={sessionId} />
}