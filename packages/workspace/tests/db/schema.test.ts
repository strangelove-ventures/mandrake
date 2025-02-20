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
        outputCost: 0,
      });

      expect(turn.status).toBe('streaming');
      expect(turn.streamEndTime).toBeNull();

      // Update turn with more content
      await testDb.manager.updateTurn(turn.id, {
        rawResponse: 'Initial content\nMore content',
        content: ['Initial content', 'More content'],
        currentTokens: 20,
        expectedTokens: 100,
      });

      const now = Date.now();
      await testDb.manager.updateTurn(turn.id, {
        status: 'completed',
        streamEndTime: new Date(now),
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
  describe('Session History', () => {
    test('should render full session history with rounds, requests, responses and turns', async () => {
      // Create session
      const session = await testDb.manager.createSession({
        title: 'Test Session',
        description: 'Test Description'
      });

      // Create first round with tool calls
      const round1 = await testDb.manager.createRound({
        sessionId: session.id,
        content: 'First request'
      });

      await testDb.manager.createTurn({
        responseId: round1.response.id,
        content: ['First response part 1'],
        rawResponse: 'First response part 1',
        toolCalls: [{
          call: { name: 'test_tool', arguments: { test: true } },
          result: { success: true }
        }],
        inputTokens: 10,
        outputTokens: 20,
        inputCost: 0.001,
        outputCost: 0.002,
        status: 'completed'
      });

      // Create second round with multiple turns
      const round2 = await testDb.manager.createRound({
        sessionId: session.id,
        content: 'Second request'
      });

      await testDb.manager.createTurn({
        responseId: round2.response.id,
        content: ['Second response part 1'],
        rawResponse: 'Second response part 1',
        inputTokens: 15,
        outputTokens: 25,
        inputCost: 0.0015,
        outputCost: 0.0025,
        status: 'completed'
      });

      await testDb.manager.createTurn({
        responseId: round2.response.id,
        content: ['Second response part 2'],
        rawResponse: 'Second response part 2',
        inputTokens: 5,
        outputTokens: 10,
        inputCost: 0.0005,
        outputCost: 0.001,
        status: 'completed'
      });

      // Render full history
      const history = await testDb.manager.renderSessionHistory(session.id);

      // Verify structure
      expect(history.session).toEqual(session);
      expect(history.rounds).toHaveLength(2);

      // Verify first round
      const firstRound = history.rounds[0];
      expect(firstRound.request.content).toBe('First request');
      expect(firstRound.response.turns).toHaveLength(1);
      expect(JSON.parse(firstRound.response.turns[0].toolCalls)).toHaveLength(1);

      // Verify second round
      const secondRound = history.rounds[1];
      expect(secondRound.request.content).toBe('Second request');
      expect(secondRound.response.turns).toHaveLength(2);
      expect(JSON.parse(secondRound.response.turns[0].content)).toEqual(['Second response part 1']);
      expect(JSON.parse(secondRound.response.turns[1].content)).toEqual(['Second response part 2']);
    });

    test('should handle empty session history', async () => {
      const session = await testDb.manager.createSession({
        title: 'Empty Session'
      });

      const history = await testDb.manager.renderSessionHistory(session.id);

      expect(history.session).toEqual(session);
      expect(history.rounds).toHaveLength(0);
    });
  });
});