// Browser-safe version of session notifier
type UpdateCallback = (session: any) => Promise<void>;

class BrowserSessionNotifier {
    // In browser context, we'll use basic event handling
    private subscriptions: Record<string, Set<UpdateCallback>> = {};

    async subscribe(sessionId: string, callback: UpdateCallback): Promise<() => void> {
        if (!this.subscriptions[sessionId]) {
            this.subscriptions[sessionId] = new Set();
        }
        this.subscriptions[sessionId].add(callback);

        // Return unsubscribe function
        return () => {
            this.subscriptions[sessionId]?.delete(callback);
            if (this.subscriptions[sessionId]?.size === 0) {
                delete this.subscriptions[sessionId];
            }
        };
    }

    // Method to notify subscribers (will be called via API)
    async notify(sessionId: string, data: any) {
        const callbacks = this.subscriptions[sessionId];
        if (callbacks) {
            await Promise.all([...callbacks].map(cb => cb(data)));
        }
    }
}

export const sessionNotifier = new BrowserSessionNotifier();