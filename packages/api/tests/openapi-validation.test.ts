import { describe, test, expect, beforeAll } from 'bun:test';
import { parse } from 'yaml';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createApp } from '../src';
import { Hono } from 'hono';

// Load the OpenAPI spec from the YAML file
const openApiSpecPath = join(__dirname, '../docs/openapi.yaml');
const openApiYaml = readFileSync(openApiSpecPath, 'utf8');
const openApiSpec = parse(openApiYaml);

describe('OpenAPI Specification Validation', () => {
  let app: Hono;

  // We'll skip the app creation for now and focus on schema validation
  // The route validation will be added later when we have mock environment setup
  /* 
  beforeAll(async () => {
    app = await createApp({});
  });
  */

  test.skip('OpenAPI spec contains all endpoints defined in the API', async () => {
    // This test requires app initialization which we'll add later
    // For now, we'll skip it and focus on schema validation
  });

  test('OpenAPI spec defines all required components', () => {
    // Verify essential components are present in the spec
    expect(openApiSpec.info).toBeDefined();
    expect(openApiSpec.info.title).toBeDefined();
    expect(openApiSpec.info.version).toBeDefined();
    expect(openApiSpec.paths).toBeDefined();
    expect(openApiSpec.components).toBeDefined();
    expect(openApiSpec.components.schemas).toBeDefined();
    expect(openApiSpec.components.responses).toBeDefined();
  });

  test('OpenAPI spec includes all common schema definitions', () => {
    // List of required/expected schema definitions
    const expectedSchemas = [
      'SystemInfo', 
      'ServiceStatus',
      'SystemConfig',
      'WorkspaceConfig',
      'WorkspaceInfo',
      'WorkspaceCreateRequest',
      'ToolOperation',
      'ToolConfig',
      'ToolConfigCreateRequest',
      'ServerConfig',
      'ModelsConfig',
      'ProviderConfig',
      'ModelInfo',
      'PromptConfig',
      'SessionInfo',
      'Message',
      'ToolCall',
      'StreamRequest',
      'FileInfo',
      'FileCreateRequest',
      'DynamicMethod',
      'DynamicMethodCreateRequest',
      'Error'
    ];
    
    const schemas = openApiSpec.components.schemas || {};
    
    for (const schema of expectedSchemas) {
      expect(schemas[schema]).toBeDefined(`Schema definition missing: ${schema}`);
    }
  });
  
  test('OpenAPI spec includes common response definitions', () => {
    // List of required/expected response definitions
    const expectedResponses = [
      'BadRequest',
      'NotFound',
      'InternalServerError'
    ];
    
    const responses = openApiSpec.components.responses || {};
    
    for (const response of expectedResponses) {
      expect(responses[response]).toBeDefined(`Response definition missing: ${response}`);
    }
  });
});