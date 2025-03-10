/**
 * Functional tests for the system API client
 * These tests make actual API calls to test functionality
 */
import { test, expect, beforeAll } from 'bun:test';
import { api } from '@/lib/api';
import { testApiClient } from '../../../lib/api-client';

// Skip all tests if API_TEST_MODE is not 'integration'
const API_TEST_MODE = process.env.API_TEST_MODE;
const runTests = API_TEST_MODE === 'integration';

// Conditional test helper that only runs in integration mode
function integrationTest(name: string, fn: () => Promise<void>) {
  if (runTests) {
    test(name, fn);
  } else {
    test.skip(name, () => {});
  }
}

// Output test mode info
beforeAll(() => {
  if (!runTests) {
    console.log('Skipping API integration tests. Set API_TEST_MODE=integration to run them.');
  } else {
    console.log('Running API integration tests against the real API...');
    console.log('Make sure the Mandrake API server is running at http://localhost:4000');
  }
});

// Test getting system status
integrationTest('can get system status', async () => {
  try {
    const status = await testApiClient.fetchJson('/');
    
    // Verify response format
    expect(status).toHaveProperty('status');
  } catch (error) {
    console.error('Get status error:', error);
    throw error;
  }
});

// Test getting system config
integrationTest('can get system config', async () => {
  try {
    const config = await testApiClient.fetchJson('/system/config');
    
    // Verify it returned an object
    expect(typeof config).toBe('object');
  } catch (error) {
    console.error('Get config error:', error);
    throw error;
  }
});

// Test listing models
integrationTest('can list models', async () => {
  try {
    const models = await testApiClient.fetchJson('/system/models');
    
    // Verify response format
    expect(Array.isArray(models)).toBe(true);
    
    // If models exist, verify their structure
    if (models.length > 0) {
      const model = models[0];
      expect(model).toHaveProperty('id');
      expect(model).toHaveProperty('name');
    }
  } catch (error) {
    console.error('List models error:', error);
    throw error;
  }
});

// Test getting active model
integrationTest('can get active model', async () => {
  try {
    const activeModel = await testApiClient.fetchJson('/system/models/active');
    
    // Verify response has expected properties
    if (activeModel) {
      expect(activeModel).toHaveProperty('id');
      expect(activeModel).toHaveProperty('name');
    }
  } catch (error) {
    console.error('Get active model error:', error);
    throw error;
  }
});