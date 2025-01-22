'use client';

import React from 'react';
import { Card } from '@/components/ui/card';

type ToolDetails = {
  name: string;
  input: any;
  result: any;
};

type ContentItem = {
  type: 'text' | 'tool';
  content: string;
  toolDetails?: ToolDetails;
};

interface MessageContentProps {
  content: ContentItem[];
}

const MessageContent: React.FC<MessageContentProps> = ({ content }) => {
  if (!Array.isArray(content)) {
    // Handle legacy string content
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  return (
    <div className="space-y-2">
      {content.map((item, index) => {
        if (item.type === 'text') {
          return (
            <div key={index} className="whitespace-pre-wrap">
              {item.content}
            </div>
          );
        } else if (item.type === 'tool') {
          return (
            <Card key={index} className="p-2 bg-gray-50 dark:bg-gray-800">
              <div className="font-medium text-sm">{item.content}</div>
              {item.toolDetails && item.toolDetails.result && (
                <div className="mt-2 text-sm">
                  <div className="font-medium text-gray-500">Result:</div>
                  <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-900 rounded overflow-x-auto">
                    {JSON.stringify(item.toolDetails.result, null, 2)}
                  </pre>
                </div>
              )}
            </Card>
          );
        }
        return null;
      })}
    </div>
  );
};

export default MessageContent;