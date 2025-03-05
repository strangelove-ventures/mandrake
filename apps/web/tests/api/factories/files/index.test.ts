import { describe, test, expect } from 'bun:test';
import { createFileActiveRoutes, createFilesRoutes } from '@/server/api/factories/files';

describe('Files Routes Factory', () => {
  test('should create route handlers for active file routes', () => {
    const routes = createFileActiveRoutes(true);

    // Verify the route handlers exist
    expect(routes.PUT).toBeInstanceOf(Function);
  });

  test('should create route handlers for createFilesRoutes', () => {
    const routes = createFilesRoutes(false);

    // Verify the route handlers exist
    expect(routes.GET).toBeInstanceOf(Function);
    expect(routes.POST).toBeInstanceOf(Function);
    expect(routes.PUT).toBeInstanceOf(Function);
    expect(routes.DELETE).toBeInstanceOf(Function);
  });
});
