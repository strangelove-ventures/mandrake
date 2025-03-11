'use client';

interface TypingIndicatorProps {
  timestamp?: string;
}

export function TypingIndicator({ timestamp = new Date().toISOString() }: TypingIndicatorProps) {
  // Format timestamp to show only hours and minutes
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };
  
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 dark:bg-gray-700">
        <div className="flex justify-between items-baseline mb-1">
          <span className="font-bold">Assistant</span>
          <span className="text-xs opacity-70 ml-2">
            {formatTime(timestamp)} <span className="text-blue-400 animate-pulse">typing...</span>
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 bg-gray-500 rounded-full animate-pulse"></div>
          <div className="h-2 w-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="h-2 w-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}
