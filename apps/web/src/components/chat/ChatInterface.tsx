"use client";

import React, { useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Loader2, MessageSquarePlus } from 'lucide-react';
import MessageContent from './MessageContent';
import { useChatStore } from '@/lib/stores/chat';
import { Turn } from '@mandrake/types';


interface ChatInterfaceProps {
  sessionId?: string
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({sessionId}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const {
    session,
    streamingTurns,
    input,
    isLoading,
    userInput,
    pendingRoundId,
    setInput,
    connectSession,
    disconnectSession,
    startNewSession,
    sendMessage
  } = useChatStore();

  // Connect to session stream
  useEffect(() => {
    if (sessionId) {
      connectSession(sessionId)
      return () => disconnectSession()
    }
  }, [sessionId])

  // Auto-scroll on new content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.rounds, streamingTurns]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input;
    setInput('');
    await sendMessage(message);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        
        <Button onClick={() => router.push('/session')} variant="outline" className="flex items-center gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          New Chat
        </Button>

        {session && (
          <div className="text-sm text-gray-500">
            {session.title || 'Untitled Chat'} • {formatDate(session.createdAt)}
          </div>
        )}
      </div>

      <Card className="flex-grow mb-4 overflow-hidden">
        <CardContent className="h-full overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Completed Rounds */}
            {session?.rounds.map((round) => (
              <React.Fragment key={round.id}>
                {round.id !== pendingRoundId && (
                  <>
                    <div className="flex justify-end">
                      <div className="max-w-3/4 p-3 rounded-lg bg-blue-500 text-white">
                        <Badge className="mb-1">You</Badge>
                        <div className="whitespace-pre-wrap">{round.request.content}</div>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="max-w-3/4 p-3 rounded-lg bg-gray-100 text-gray-900">
                        <Badge className="mb-1">Assistant</Badge>
                        <MessageContent turns={round.response.turns} />
                      </div>
                    </div>
                  </>
                )}
              </React.Fragment>
            ))}

            {/* Streaming Content */}
            {streamingTurns.length > 0 && pendingRoundId && (
              <>
                <div className="flex justify-end">
                  <div className="max-w-3/4 p-3 rounded-lg bg-blue-500 text-white">
                    <Badge className="mb-1">You</Badge>
                    <div className="whitespace-pre-wrap">{userInput}</div>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-3/4 p-3 rounded-lg bg-gray-100 text-gray-900">
                    <Badge className="mb-1">Assistant</Badge>
                    <MessageContent turns={streamingTurns} />
                    <span className="inline-block w-1.5 h-4 bg-current animate-pulse ml-1">|</span>
                  </div>
                </div>
              </>
            )}

            <div ref={messagesEndRef} />
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-grow p-2 border rounded"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
        </Button>
      </form>
    </div>
  );
};

export default ChatInterface;