/**
 * Test-specific API client initialization
 */
import { ApiClient } from '@/lib/api/core/fetcher';
import { API_BASE_URL } from '../api-url';

/**
 * Create an API client specifically for testing
 * This uses the URL provided by the test runner
 */
export const testApiClient = new ApiClient({
  baseUrl: API_BASE_URL
});