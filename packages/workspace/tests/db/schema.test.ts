import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { eq } from 'drizzle-orm';
import * as schema from '../../src/session/db/schema';
import type { TestDb } from '../utils/db';
import { createTestDb, createTestSession, createStreamingTurn } from '../utils/db';

const { sessions, responses, turns } = schema;

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
      const session = await createTestSession(testDb.db, {
        title: 'Test Session',
        description: 'Test Description'
      });

      expect(session.id).toBeDefined();
      expect(session.title).toBe('Test Session');
      
      const retrieved = await (testDb.db.query as any).sessions.findFirst({
        where: eq(sessions.id, session.id)
      });
      
      expect(retrieved).toEqual(session);
    });
  });

  describe('Turn Streaming', () => {
    test('should handle streaming state', async () => {
      // Create session with response
      const session = await createTestSession(testDb.db);
      const response = await testDb.db.insert(responses)
        .values({}).returning().get();

      // Create streaming turn
      const turn = await createStreamingTurn(testDb.db, response.id, [
        'Initial content'
      ]);

      expect(turn.status).toBe('streaming');
      expect(turn.streamEndTime).toBeNull();

      // Update turn with more content
      await testDb.db.update(turns)
        .set({ 
          rawResponse: 'Initial content\nMore content',
          content: JSON.stringify(['Initial content', 'More content']),
          currentTokens: 20,
          expectedTokens: 100
        })
        .where(eq(turns.id, turn.id));

      // Complete the stream
      await testDb.db.update(turns)
        .set({ 
          status: 'completed',
          streamEndTime: Math.floor(Date.now() / 1000)
        })
        .where(eq(turns.id, turn.id));

      const completed = await (testDb.db.query as any).turns.findFirst({
        where: eq(turns.id, turn.id)
      });

      expect(completed?.status).toBe('completed');
      expect(completed?.streamEndTime).toBeDefined();
      expect(JSON.parse(completed?.content || '[]')).toEqual([
        'Initial content',
        'More content'
      ]);
    });
  });
});