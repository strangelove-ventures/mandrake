'use client';

import { Message, ResponseMessage } from './types';
import { ToolCallDisplay } from './ToolCallDisplay';
import { extractToolCallsForDisplay } from '@mandrake/utils/src/tools/parser';

interface MessageBubbleProps {
  message: Message | ResponseMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  // Format timestamp to show only hours and minutes
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isUser = message.role === 'user';
  const isResponse = !isUser && 'turns' in message && Array.isArray(message.turns);

  if (isUser) {
    // Simple display for user messages
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg p-3 bg-blue-500 text-white">
          <div className="flex justify-between items-baseline mb-1">
            <span className="font-bold">You</span>
            <span className="text-xs opacity-70 ml-2">
              {formatTime(message.createdAt)}
            </span>
          </div>
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  if (isResponse) {
    // Complex display for assistant responses with turns and tool calls
    const response = message as ResponseMessage;

    // Process each turn to extract content and tool calls in sequence
    const contentBlocks: React.ReactNode[] = [];

    response.turns.forEach((turn, turnIndex) => {
      // Only add content if not empty
      if (turn.content?.trim()) {
        contentBlocks.push(
          <div key={`text-${turn.id || turnIndex}`} className="whitespace-pre-wrap mb-3">
            {turn.content}
          </div>
        );
      }

      // Extract and add tool calls if present
      if (turn.rawResponse) {
        const toolCalls = extractToolCallsForDisplay(turn.rawResponse);

        // Process tool calls in pairs (request and response)
        const requestCalls = toolCalls.filter(call => call.callType === 'request');

        requestCalls.forEach((requestCall, i) => {
          // Find the matching response or error
          const responseCall = toolCalls.find(
            call =>
              (call.callType === 'response' || call.callType === 'error') &&
              call.serverName === requestCall.serverName &&
              call.methodName === requestCall.methodName
          );

          contentBlocks.push(
            <div key={`tool-${requestCall.id || i}`} className="mb-3">
              <ToolCallDisplay
                toolCall={requestCall}
                responseCall={responseCall}
              />
            </div>
          );
        });
      }
    });

    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 dark:bg-gray-700">
          <div className="flex justify-between items-baseline mb-1">
            <span className="font-bold">Assistant</span>
            <span className="text-xs opacity-70 ml-2">
              {formatTime(response.createdAt)}
            </span>
          </div>

          {/* Display content blocks in sequence */}
          {contentBlocks.length > 0 ? (
            <div className="space-y-2">
              {contentBlocks}
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{response.content || "No content"}</p>
          )}
        </div>
      </div>
    );
  }

  // Fallback for simple assistant messages
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 dark:bg-gray-700">
        <div className="flex justify-between items-baseline mb-1">
          <span className="font-bold">Assistant</span>
          <span className="text-xs opacity-70 ml-2">
            {formatTime(message.createdAt)}
          </span>
        </div>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}