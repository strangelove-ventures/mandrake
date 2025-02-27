import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { createTestDb, type TestDb } from '../utils/db';

describe('SessionManager Streaming', () => {
  let testDb: TestDb;

  beforeEach(async () => {
    testDb = await createTestDb();
  });

  afterEach(async () => {
    await testDb?.cleanup();
  });

  test('should update and notify listeners when turn is updated', async () => {
    // Create session and round
    const session = await testDb.manager.createSession({
      title: 'Streaming Test Session'
    });
    
    const { response } = await testDb.manager.createRound({
      sessionId: session.id,
      content: 'Test streaming request'
    });
    
    // Create initial turn
    const turn = await testDb.manager.createTurn({
      responseId: response.id,
      content: 'Initial content',
      rawResponse: 'Initial content',
      status: 'streaming',
      inputTokens: 10,
      outputTokens: 5,
      inputCost: 0.001,
      outputCost: 0.0005
    });
    
    // Set up a listener to track updates
    const updates: string[] = [];
    const removeListener = testDb.manager.addTurnUpdateListener(turn.id, (updatedTurn) => {
      updates.push(updatedTurn.content);
    });
    
    // Verify initial state
    expect(turn.status).toBe('streaming');
    // streamEndTime may have a default value until migration runs
    expect(turn.streamEndTime).toBeDefined();
    
    // Update turn multiple times to simulate streaming
    await testDb.manager.updateTurn(turn.id, {
      content: 'Initial content\nMore content'
    });
    
    await testDb.manager.updateTurn(turn.id, {
      content: 'Initial content\nMore content\nEven more content'
    });
    
    await testDb.manager.updateTurn(turn.id, {
      content: 'Initial content\nMore content\nEven more content\nFinal content',
      status: 'completed',
      streamEndTime: Math.floor(Date.now() / 1000)
    });
    
    // Check that the listener was called for each update
    expect(updates).toHaveLength(3);
    expect(updates[0]).toBe('Initial content\nMore content');
    expect(updates[1]).toBe('Initial content\nMore content\nEven more content');
    expect(updates[2]).toBe('Initial content\nMore content\nEven more content\nFinal content');
    
    // Clean up
    removeListener();
  });

  test('should track streaming turns for a response', async () => {
    // Create session and round
    const session = await testDb.manager.createSession({
      title: 'Tracking Test Session'
    });
    
    const { response } = await testDb.manager.createRound({
      sessionId: session.id,
      content: 'Test tracking request'
    });
    
    // Create streaming turn
    const turn = await testDb.manager.createTurn({
      responseId: response.id,
      content: 'Streaming content',
      rawResponse: 'Streaming content',
      status: 'streaming',
      inputTokens: 10,
      outputTokens: 5,
      inputCost: 0.001,
      outputCost: 0.0005
    });
    
    // Track all streaming turns
    const allUpdates: Array<{ id: string, content: string, status: string }> = [];
    const stopTracking = testDb.manager.trackStreamingTurns(response.id, (turn) => {
      allUpdates.push({
        id: turn.id,
        content: turn.content,
        status: turn.status
      });
    });
    
    // Short delay to allow tracking to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Update the turn
    await testDb.manager.updateTurn(turn.id, {
      content: 'Streaming content updated',
    });
    
    // Short delay to allow tracking to catch the update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Create a second turn for the same response
    const turn2 = await testDb.manager.createTurn({
      responseId: response.id,
      content: 'Second turn content',
      rawResponse: 'Second turn content',
      status: 'streaming',
      inputTokens: 8,
      outputTokens: 4,
      inputCost: 0.0008,
      outputCost: 0.0004
    });
    
    // Short delay to allow tracking to detect the new turn
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Mark both turns as completed
    await testDb.manager.updateTurn(turn.id, {
      status: 'completed',
      streamEndTime: Math.floor(Date.now() / 1000)
    });
    
    await testDb.manager.updateTurn(turn2.id, {
      status: 'completed',
      streamEndTime: Math.floor(Date.now() / 1000)
    });
    
    // Short delay to allow tracking to process the completion
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Clean up
    stopTracking();
    
    // Check results
    expect(allUpdates.length).toBeGreaterThanOrEqual(4); // At least 4 updates (initial turn, updated turn, second turn, completed)
    
    // First update should be the initial turn
    expect(allUpdates[0].id).toBe(turn.id);
    expect(allUpdates[0].content).toBe('Streaming content');
    
    // Should have an update for the content change
    const contentUpdateIndex = allUpdates.findIndex(u => 
      u.id === turn.id && u.content === 'Streaming content updated'
    );
    expect(contentUpdateIndex).toBeGreaterThan(0);
    
    // Should have tracked the second turn
    const secondTurnIndex = allUpdates.findIndex(u => u.id === turn2.id);
    expect(secondTurnIndex).toBeGreaterThan(0);
    
    // Should have completion updates
    const completionIndex = allUpdates.findIndex(u => 
      u.id === turn.id && u.status === 'completed'
    );
    expect(completionIndex).toBeGreaterThan(0);
  });

  test('should correctly report streaming status', async () => {
    // Create session and round
    const session = await testDb.manager.createSession({
      title: 'Status Test Session'
    });
    
    const { response } = await testDb.manager.createRound({
      sessionId: session.id,
      content: 'Test status request'
    });
    
    // Check status with no turns
    let status = await testDb.manager.getStreamingStatus(response.id);
    expect(status.isComplete).toBe(true); // No turns = complete
    expect(status.turns).toHaveLength(0);
    
    // Create streaming turn
    const turn = await testDb.manager.createTurn({
      responseId: response.id,
      content: 'Status content',
      rawResponse: 'Status content',
      status: 'streaming',
      inputTokens: 10,
      outputTokens: 5,
      inputCost: 0.001,
      outputCost: 0.0005
    });
    
    // Check status with streaming turn
    status = await testDb.manager.getStreamingStatus(response.id);
    expect(status.isComplete).toBe(false);
    expect(status.turns).toHaveLength(1);
    
    // Complete the turn
    await testDb.manager.updateTurn(turn.id, {
      status: 'completed',
      streamEndTime: Math.floor(Date.now() / 1000)
    });
    
    // Check status with completed turn
    status = await testDb.manager.getStreamingStatus(response.id);
    expect(status.isComplete).toBe(true);
    expect(status.turns).toHaveLength(1);
    expect(status.turns[0].status).toBe('completed');
  });

  test('should handle tool calls during streaming', async () => {
    // Create session and round
    const session = await testDb.manager.createSession({
      title: 'Tool Calls Test Session'
    });
    
    const { response } = await testDb.manager.createRound({
      sessionId: session.id,
      content: 'Test with tool calls'
    });
    
    // Create initial turn with no tool calls
    const turn = await testDb.manager.createTurn({
      responseId: response.id,
      content: 'Starting response',
      rawResponse: 'Starting response',
      status: 'streaming',
      inputTokens: 10,
      outputTokens: 5,
      inputCost: 0.001,
      outputCost: 0.0005
    });
    
    // Update with a tool call
    const toolCall = {
      call: {
        serverName: 'file_system',
        methodName: 'readFile',
        arguments: { path: 'test.txt' }
      },
      response: null
    };
    
    await testDb.manager.updateTurn(turn.id, {
      content: 'Starting response\nI need to read a file.',
      toolCalls: toolCall
    });
    
    // Get the turn with parsed tool calls
    const turnWithToolCalls = await testDb.manager.getTurnWithParsedToolCalls(turn.id);
    
    // Verify tool call was stored correctly
    expect(turnWithToolCalls.parsedToolCalls.call).toEqual(toolCall.call);
    expect(turnWithToolCalls.parsedToolCalls.response).toBeNull();
    
    // Update with tool call response
    const updatedToolCall = {
      ...toolCall,
      response: { content: 'File content here' }
    };
    
    await testDb.manager.updateTurn(turn.id, {
      content: 'Starting response\nI need to read a file.\nThe file contains: File content here',
      toolCalls: updatedToolCall,
      status: 'completed'
    });
    
    // Get the updated turn
    const completedTurn = await testDb.manager.getTurnWithParsedToolCalls(turn.id);
    
    // Verify tool call response was stored
    expect(completedTurn.parsedToolCalls.call).toEqual(updatedToolCall.call);
    expect(completedTurn.parsedToolCalls.response).toEqual(updatedToolCall.response);
    expect(completedTurn.status).toBe('completed');
  });
});
