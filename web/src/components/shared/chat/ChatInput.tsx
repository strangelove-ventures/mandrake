'use client';

import { useState } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isDisabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
}

export function ChatInput({ 
  onSendMessage,
  isDisabled = false,
  isStreaming = false,
  placeholder = "Type your message..."
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isDisabled) return;
    
    onSendMessage(message);
    setMessage(''); // Clear input after sending
  };
  
  return (
    <div className="p-4 border-t dark:border-gray-700">
      <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
        <div className="flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 resize-none"
            placeholder={isStreaming ? "AI is responding..." : placeholder}
            disabled={isDisabled || isStreaming}
            rows={3}
            onKeyDown={(e) => {
              // Submit on Ctrl+Enter or Command+Enter
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (message.trim() && !isDisabled && !isStreaming) {
                  handleSubmit(e);
                }
              }
            }}
          />
          <div className="text-xs text-gray-500 mt-1">
            Press Ctrl+Enter or Command+Enter to send
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isDisabled || isStreaming || !message.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isDisabled ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
