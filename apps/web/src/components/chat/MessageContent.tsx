// components/chat/MessageContent.tsx
'use client';

import React from 'react';
import ToolCall from './ToolCall';

interface Turn {
  id: string;
  index: number;
  content?: string;
  toolCall?: {
    server: string;
    name: string;
    input: any;
  };
  toolResult?: any;
}

interface MessageContentProps {
  turns: Turn[];
}

const MessageContent: React.FC<MessageContentProps> = ({ turns }) => {
  return (
    <div className="space-y-2">
      {turns.map((turn) => {
        if (turn.content) {
          return (
            <div key={turn.id} className="whitespace-pre-wrap">
              {turn.content}
            </div>
          );
        } else if (turn.toolCall) {
          return (
            <ToolCall
              key={turn.id}
              name={turn.toolCall.name}
              input={turn.toolCall.input}
              result={turn.toolResult}
              serverId={turn.toolCall.server}
            />
          );
        }
        return null;
      })}
    </div>
  );
};

export default MessageContent;