"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Loader2, MessageSquarePlus } from 'lucide-react';
import MessageContent from './MessageContent';

type Message = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  isStreaming?: boolean;
};

type Conversation = {
  id: string;
  messages: Message[];
  createdAt: string;
};

const ChatInterface = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/chat/conversations');
      const data = await response.json();
      setConversations(data);
      
      if (!currentConversationId && data.length > 0) {
        await loadConversation(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chat/${conversationId}`);
      const data = await response.json();
      setMessages(data.messages || []);
      setCurrentConversationId(conversationId);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    const userInput = input;
    setInput('');

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userInput,
          conversationId: currentConversationId,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Stream response not ok');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          const data = JSON.parse(line);

          switch (data.type) {
            case 'init':
              setCurrentConversationId(data.conversationId);
              setMessages(prev => [...prev, data.userMessage]);
              setMessages(prev => [...prev, {
                id: 'streaming',
                role: 'assistant',
                content: '',
                createdAt: new Date().toISOString(),
                isStreaming: true
              }]);
              break;

            case 'chunk':
              setMessages(prev => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage.isStreaming) {
                  return [
                    ...prev.slice(0, -1),
                    { ...lastMessage, content: lastMessage.content + data.content }
                  ];
                }
                return prev;
              });
              break;

            case 'done':
              setMessages(prev => [
                ...prev.slice(0, -1),
                { ...data.aiMessage, isStreaming: false }
              ]);
              await fetchConversations();
              break;
          }
        }
      }
    } catch (error) {
      console.error('Error in chat stream:', error);
      setMessages(prev => 
        prev[prev.length - 1]?.isStreaming 
          ? prev.slice(0, -1)
          : prev
      );
    } finally {
      setIsLoading(false);
    }
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
        <Button onClick={startNewConversation} variant="outline" className="flex items-center gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          New Chat
        </Button>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">History</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Conversation History</SheetTitle>
            </SheetHeader>
            <div className="py-4">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`w-full text-left p-3 rounded hover:bg-gray-100 mb-2 ${
                    conv.id === currentConversationId ? 'bg-gray-100' : ''
                  }`}
                >
                  <div className="font-medium">
                    {conv.messages[0]?.content.slice(0, 30)}...
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDate(conv.createdAt)}
                  </div>
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Card className="flex-grow mb-4 overflow-hidden">
        <CardContent className="h-full overflow-y-auto p-4">
          <div className="space-y-4">
            {Array.isArray(messages) && messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-3/4 p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <Badge className="mb-1">
                    {message.role === 'user' ? 'You' : 'Assistant'}
                  </Badge>
                  <MessageContent content={message.content} />
                  {message.isStreaming && (
                    <span className="inline-block w-1.5 h-4 bg-current animate-pulse ml-1">|</span>
                  )}
                </div>
              </div>
            ))}
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
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Send'
          )}
        </Button>
      </form>
    </div>
  );
};

export default ChatInterface;