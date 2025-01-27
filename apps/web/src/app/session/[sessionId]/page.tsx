import ChatInterface from '@/components/chat/ChatInterface'
export default function ChatPage({ params }: { params: { sessionId: string } }) {
    return <ChatInterface sessionId={params.sessionId} />
}