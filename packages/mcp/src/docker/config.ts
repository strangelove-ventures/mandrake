export const SERVER_CONFIG = {
    retry: {
        maxAttempts: 20,
        delay: 250,
        stopRetries: 3,
        stopDelay: 500
    },
    client: {
        info: {
            name: 'mandrake',
            version: '1.0.0',
        },
        options: {
            capabilities: {
                tools: {},
            }
        }
    }
} as const;