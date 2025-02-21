import type { ContentResult, TextContent, ImageContent } from '../types';

export function getTextContent(result: string | ContentResult | TextContent | ImageContent): string | undefined {
    if (typeof result === 'string') {
        return result;
    }

    if ('content' in result) {
        const content = result.content[0];
        if (content.type === 'text') {
            return content.text;
        }
    }

    if ('type' in result && result.type === 'text') {
        return result.text;
    }

    return undefined;
}

export function parseJsonResult<T>(result: string | ContentResult | TextContent | ImageContent): T | undefined {
    const text = getTextContent(result);
    if (text) {
        try {
            return JSON.parse(text);
        } catch {
            return undefined;
        }
    }
    return undefined;
}