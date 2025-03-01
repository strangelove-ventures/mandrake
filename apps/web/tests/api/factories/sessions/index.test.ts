import { describe, test, expect } from 'bun:test';
import { createSessionRoutes } from '@/lib/api/factories/sessions';

describe('Session Routes Factory', () => {
    test('should create route handlers for workspace-scoped routes', () => {
        const routes = createSessionRoutes({ workspace: 'test-workspace' });

        // Verify the route handlers exist
        expect(routes.GET).toBeInstanceOf(Function);
        expect(routes.POST).toBeInstanceOf(Function);
        expect(routes.PUT).toBeInstanceOf(Function);
        expect(routes.DELETE).toBeInstanceOf(Function);
    });

    test('should create route handlers for system-level routes', () => {
        const routes = createSessionRoutes();

        // Verify the route handlers exist
        expect(routes.GET).toBeInstanceOf(Function);
        expect(routes.POST).toBeInstanceOf(Function);
        expect(routes.PUT).toBeInstanceOf(Function);
        expect(routes.DELETE).toBeInstanceOf(Function);
    });
});