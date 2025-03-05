import { describe, test, expect } from 'bun:test';
import { createPromptRoutes } from '@/server/api/factories/prompt';

describe('Prompt Routes Factory', () => {
  test('should create route handlers for createPromptRoutes', () => {
    const routes = createPromptRoutes(false);

    // Verify the route handlers exist
    expect(routes.GET).toBeInstanceOf(Function);
    expect(routes.PUT).toBeInstanceOf(Function);
  });
});
