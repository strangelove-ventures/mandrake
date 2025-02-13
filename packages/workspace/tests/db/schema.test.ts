import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import type { TestDb } from '../utils/db';
import { createTestDb } from '../utils/db';

describe('Database Schema', () => {
  let testDb: TestDb;

  beforeEach(async () => {
    testDb = await createTestDb();
  });

  afterEach(async () => {
    await testDb?.cleanup();
  });

  describe('Session Management', () => {
    test('should create and retrieve a session', async () => {
      const session = await testDb.manager.createSession({
        title: 'Test Session',
        description: 'Test Description'
      });

      expect(session.id).toBeDefined();
      expect(session.title).toBe('Test Session');

      const retrieved = await testDb.manager.getSession(session.id);
      expect(retrieved).toEqual(session);
    });
  });

  describe('Turn Streaming', () => {
    test('should handle streaming state', async () => {
      // Create session
      const session = await testDb.manager.createSession({
        title: 'Test Session'
      });

      // Create round with request/response
      const { response } = await testDb.manager.createRound({
        sessionId: session.id,
        content: 'Test request'
      });

      // Create streaming turn
      const turn = await testDb.manager.createTurn({
        responseId: response.id,
        content: ['Initial content'],
        rawResponse: 'Initial content',
        inputTokens: 0,
        outputTokens: 0,
        inputCost: 0,
        outputCost: 0
      });

      expect(turn.status).toBe('streaming');
      expect(turn.streamEndTime).toBeNull();

      // Update turn with more content
      await testDb.manager.updateTurn(turn.id, {
        rawResponse: 'Initial content\nMore content',
        content: ['Initial content', 'More content'],
        currentTokens: 20,
        expectedTokens: 100
      });

      // Complete the stream
      await testDb.manager.updateTurn(turn.id, {
        status: 'completed',
        streamEndTime: Math.floor(Date.now() / 1000)
      });

      const completed = await testDb.manager.getLatestTurn(response.id);
      expect(completed?.status).toBe('completed');
      expect(completed?.streamEndTime).toBeDefined();
      expect(JSON.parse(completed?.content || '[]')).toEqual([
        'Initial content',
        'More content'
      ]);
    });
  });
});