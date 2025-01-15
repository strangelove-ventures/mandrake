"use client";

import React, { useState } from 'react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import oneDark from 'react-syntax-highlighter/dist/cjs/styles/prism/one-dark';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'typescript' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Detect the language from code fence if present
  const detectLanguage = (code: string): { cleanCode: string; detectedLang: string } => {
    const codeBlockRegex = /^```(\w+)?\n([\s\S]*?)```$/;
    const match = code.match(codeBlockRegex);
    
    if (match) {
      return {
        cleanCode: match[2],
        detectedLang: match[1]?.toLowerCase() || language
      };
    }
    
    return {
      cleanCode: code,
      detectedLang: language
    };
  };

  const { cleanCode, detectedLang } = detectLanguage(code);

  return (
    <div className="relative rounded-md overflow-hidden my-2">
      <div className="flex justify-between items-center px-4 py-2 bg-gray-800 text-gray-200">
        <span className="text-sm font-mono">{detectedLang}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="text-gray-200 hover:text-white"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <SyntaxHighlighter
        language={detectedLang}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.9rem',
        }}
      >
        {cleanCode}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodeBlock;