'use client';

import { useState } from 'react';
import { ToolCallDisplay as ToolCallDisplayType } from '@mandrake/utils/src/tools/types';

interface ToolCallDisplayProps {
    toolCall: ToolCallDisplayType;
    responseCall?: ToolCallDisplayType;
}

export function ToolCallDisplay({ toolCall, responseCall }: ToolCallDisplayProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Determine the display style based on the call type
    const getHeaderStyle = () => {
        switch (toolCall.callType) {
            case 'request':
                return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
            case 'response':
                return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
            case 'error':
                return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
            default:
                return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
        }
    };

    // Format data for display
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatData = (data: any) => {
        if (typeof data === 'string') {
            return data;
        }
        return JSON.stringify(data, null, 2);
    };

    // Get icon for call type
    const getIcon = () => {
        switch (toolCall.callType) {
            case 'request':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                        <polyline points="10 17 15 12 10 7" />
                        <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                );
            case 'response':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 10 4 15 9 20" />
                        <path d="M20 4v7a4 4 0 0 1-4 4H4" />
                    </svg>
                );
            case 'error':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                );
            default:
                return null;
        }
    };

    // Get response status icon/badge
    const getStatusBadge = () => {
        if (!responseCall) {
            return (
                <span className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Pending
                </span>
            );
        }

        if (responseCall.callType === 'error') {
            return (
                <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Error
                </span>
            );
        }

        return (
            <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                </svg>
                Complete
            </span>
        );
    };

    return (
        <div className="border rounded-md overflow-hidden text-sm bg-white dark:bg-gray-800">
            {/* Header with server.method name */}
            <div
                className={`px-3 py-2 flex items-center justify-between cursor-pointer ${getHeaderStyle()}`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    {getIcon()}
                    <span className="font-medium">{toolCall.serverName}.{toolCall.methodName}</span>
                </div>
                <div className="flex items-center gap-2">
                    {getStatusBadge()}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </div>
            </div>

            {/* Collapsible content */}
            {isExpanded && (
                <div>
                    {/* Request section */}
                    <div className="p-3 border-b dark:border-gray-700">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold">REQUEST</div>
                        <div className="font-mono text-xs overflow-x-auto bg-gray-50 dark:bg-gray-900 p-2 rounded">
                            <pre>{formatData(toolCall.data)}</pre>
                        </div>
                    </div>

                    {/* Response section */}
                    <div className="p-3">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold">
                            {responseCall?.callType === 'error' ? 'ERROR' : 'RESPONSE'}
                        </div>
                        <div className={`font-mono text-xs overflow-x-auto p-2 rounded ${responseCall
                                ? responseCall.callType === 'error'
                                    ? 'bg-red-50 dark:bg-red-900/20'
                                    : 'bg-green-50 dark:bg-green-900/20'
                                : 'bg-gray-50 dark:bg-gray-900 italic'
                            }`}>
                            {responseCall ? (
                                <pre>{formatData(responseCall.data)}</pre>
                            ) : (
                                <p>Waiting for response...</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}