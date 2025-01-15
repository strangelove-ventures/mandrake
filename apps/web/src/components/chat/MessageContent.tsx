"use client";

import React from 'react';
import CodeBlock from './CodeBlock';

interface MessageContentProps {
  content: string;
}

const MessageContent: React.FC<MessageContentProps> = ({ content }) => {
  // Split content into code blocks and regular text
  const parseContent = (text: string) => {
    const segments: { type: 'text' | 'code'; content: string }[] = [];
    const regex = /(```[\s\S]*?```)|(`[^`]+`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }

      // Add the code block
      if (match[0].startsWith('```')) {
        segments.push({
          type: 'code',
          content: match[0]
        });
      } else {
        // Inline code
        segments.push({
          type: 'text',
          content: match[0]
        });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }

    return segments;
  };

  const segments = parseContent(content);

  return (
    <div className="whitespace-pre-wrap">
      {segments.map((segment, index) => {
        if (segment.type === 'code') {
          return <CodeBlock key={index} code={segment.content} />;
        }
        return (
          <span key={index} className="break-words">
            {segment.content}
          </span>
        );
      })}
    </div>
  );
};

export default MessageContent;