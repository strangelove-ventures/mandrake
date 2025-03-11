'use client';

interface MessageBubbleProps {
  content: string;
  role: 'user' | 'assistant' | string;
  timestamp: string;
}

export function MessageBubble({ content, role, timestamp }: MessageBubbleProps) {
  // Format timestamp to show only hours and minutes
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };
  
  const isUser = role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[80%] rounded-lg p-3 ${
          isUser 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-100 dark:bg-gray-700'
        }`}
      >
        <div className="flex justify-between items-baseline mb-1">
          <span className="font-bold">{isUser ? 'You' : 'Assistant'}</span>
          <span className="text-xs opacity-70 ml-2">
            {formatTime(timestamp)}
          </span>
        </div>
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
