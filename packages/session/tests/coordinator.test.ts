import { describe, test, expect } from 'bun:test';
import { SessionCoordinator } from '../src/coordinator';

describe('Session Coordinator', () => {
  test('constructs without error', () => {
    const coordinator = new SessionCoordinator({
      promptManager: {} as any,
      sessionManager: {} as any,
      mcpManager: {} as any,
      modelsManager: {} as any
    });

    expect(coordinator).toBeDefined();
  });

  // TODO: Add more tests as implementation progresses
});