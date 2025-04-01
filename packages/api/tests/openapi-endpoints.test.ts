import { describe, test, expect } from 'bun:test';
import { parse } from 'yaml';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createApp } from '../src';

// Load the OpenAPI spec from the YAML file
const openApiSpecPath = join(__dirname, '../docs/openapi.yaml');
const openApiYaml = readFileSync(openApiSpecPath, 'utf8');
const openApiSpec = parse(openApiYaml);

// Define the endpoints to validate (excluding streaming endpoints)
const endpointsToValidate = [
  // System endpoints
  { method: 'GET', path: '/system' },
  { method: 'GET', path: '/system/config' },
  { method: 'PUT', path: '/system/config' },
  { method: 'GET', path: '/system/tools/operations' },
  { method: 'GET', path: '/system/tools/configs' },
  { method: 'POST', path: '/system/tools/configs' },
  { method: 'GET', path: '/system/tools/configs/:configId' },
  { method: 'PUT', path: '/system/tools/active' },
  { method: 'GET', path: '/system/models' },
  { method: 'GET', path: '/system/models/active' },
  { method: 'PUT', path: '/system/models/active' },
  { method: 'GET', path: '/system/prompt' },
  { method: 'PUT', path: '/system/prompt' },
  { method: 'GET', path: '/system/sessions' },
  { method: 'POST', path: '/system/sessions' },
  { method: 'GET', path: '/system/sessions/:sessionId' },
  { method: 'DELETE', path: '/system/sessions/:sessionId' },
  { method: 'GET', path: '/system/sessions/:sessionId/history' },
  
  // Workspace endpoints
  { method: 'GET', path: '/workspaces' },
  { method: 'POST', path: '/workspaces' },
  { method: 'GET', path: '/workspaces/:workspaceId' },
  { method: 'DELETE', path: '/workspaces/:workspaceId' },
  { method: 'GET', path: '/workspaces/:workspaceId/config' },
  { method: 'PUT', path: '/workspaces/:workspaceId/config' },
  { method: 'GET', path: '/workspaces/:workspaceId/tools/operations' },
  { method: 'GET', path: '/workspaces/:workspaceId/tools/configs' },
  { method: 'POST', path: '/workspaces/:workspaceId/tools/configs' },
  { method: 'GET', path: '/workspaces/:workspaceId/tools/configs/:configId' },
  { method: 'GET', path: '/workspaces/:workspaceId/models' },
  { method: 'GET', path: '/workspaces/:workspaceId/prompt' },
  { method: 'PUT', path: '/workspaces/:workspaceId/prompt' },
  { method: 'GET', path: '/workspaces/:workspaceId/files' },
  { method: 'POST', path: '/workspaces/:workspaceId/files' },
  { method: 'GET', path: '/workspaces/:workspaceId/dynamic' },
  { method: 'POST', path: '/workspaces/:workspaceId/dynamic' },
  { method: 'GET', path: '/workspaces/:workspaceId/sessions' },
  { method: 'POST', path: '/workspaces/:workspaceId/sessions' },
  { method: 'GET', path: '/workspaces/:workspaceId/sessions/:sessionId' },
  { method: 'DELETE', path: '/workspaces/:workspaceId/sessions/:sessionId' },
  { method: 'GET', path: '/workspaces/:workspaceId/sessions/:sessionId/history' }
];

// Helper to convert API path to OpenAPI path
function apiPathToOpenApiPath(path: string): string {
  // Convert Hono-style path params (:paramName) to OpenAPI-style ({paramName})
  return path.replace(/:([^/]+)/g, '{$1}');
}

describe('OpenAPI Endpoint Validation', () => {
  test('All non-streaming endpoints are defined in OpenAPI spec', () => {
    // Get all the paths defined in the OpenAPI spec
    const specPaths = openApiSpec.paths || {};
    
    // Log available paths for debugging
    console.log('Available OpenAPI paths:', Object.keys(specPaths));
    
    // Check each endpoint
    for (const endpoint of endpointsToValidate) {
      const openApiPath = apiPathToOpenApiPath(endpoint.path);
      const pathSpec = specPaths[openApiPath];
      
      if (!pathSpec) {
        console.log(`Missing path in OpenAPI spec: ${openApiPath} (${endpoint.method} ${endpoint.path})`);
      }
      
      // Verify path exists in spec
      expect(pathSpec).toBeDefined(`Path ${openApiPath} not found in OpenAPI spec`);
      
      // Verify method exists for path
      if (pathSpec) {
        const methodSpec = pathSpec[endpoint.method.toLowerCase()];
        expect(methodSpec).toBeDefined(`Method ${endpoint.method} for path ${openApiPath} not found in OpenAPI spec`);
        
        // Verify essential properties
        if (methodSpec) {
          expect(methodSpec.summary).toBeDefined(`Missing summary for ${endpoint.method} ${openApiPath}`);
          expect(methodSpec.description).toBeDefined(`Missing description for ${endpoint.method} ${openApiPath}`);
          expect(methodSpec.operationId).toBeDefined(`Missing operationId for ${endpoint.method} ${openApiPath}`);
          
          // All endpoints should have at least one response
          expect(methodSpec.responses).toBeDefined(`Missing responses for ${endpoint.method} ${openApiPath}`);
          expect(Object.keys(methodSpec.responses).length).toBeGreaterThan(0, 
            `No responses defined for ${endpoint.method} ${openApiPath}`);
            
          // Verify 200-level success response for GET, POST, PUT methods
          if (['GET', 'POST', 'PUT'].includes(endpoint.method)) {
            const successResponseExists = Object.keys(methodSpec.responses).some(code => 
              code.startsWith('2'));
            expect(successResponseExists).toBe(true, 
              `No success response (2xx) defined for ${endpoint.method} ${openApiPath}`);
          }
          
          // Verify 204 response for DELETE
          if (endpoint.method === 'DELETE') {
            expect(methodSpec.responses['204']).toBeDefined(
              `DELETE endpoint ${openApiPath} should have 204 response`);
          }
          
          // Verify error responses
          const hasErrorResponse = Object.keys(methodSpec.responses).some(code => 
            code.startsWith('4') || code.startsWith('5'));
          expect(hasErrorResponse).toBe(true, 
            `No error responses (4xx or 5xx) defined for ${endpoint.method} ${openApiPath}`);
            
          // Verify request body for POST and PUT
          if (['POST', 'PUT'].includes(endpoint.method)) {
            expect(methodSpec.requestBody).toBeDefined(
              `Missing request body for ${endpoint.method} ${openApiPath}`);
            
            if (methodSpec.requestBody) {
              expect(methodSpec.requestBody.content).toBeDefined(
                `Missing request body content for ${endpoint.method} ${openApiPath}`);
              
              const hasJsonContent = methodSpec.requestBody.content && 
                'application/json' in methodSpec.requestBody.content;
              expect(hasJsonContent).toBe(true, 
                `Missing application/json content for ${endpoint.method} ${openApiPath} request body`);
            }
          }
          
          // Verify parameters for endpoints with path parameters
          if (openApiPath.includes('{')) {
            expect(methodSpec.parameters).toBeDefined(
              `Missing parameters for ${endpoint.method} ${openApiPath}`);
            
            if (methodSpec.parameters) {
              // Count path parameters in URL
              const pathParamMatches = openApiPath.match(/\{([^}]+)\}/g) || [];
              const pathParamCount = pathParamMatches.length;
              
              // Count path parameters in spec
              const specPathParamCount = methodSpec.parameters.filter((p: any) => 
                p.in === 'path').length;
              
              expect(specPathParamCount).toBe(pathParamCount, 
                `Path parameter count mismatch for ${endpoint.method} ${openApiPath}: ` +
                `Expected ${pathParamCount}, got ${specPathParamCount}`);
            }
          }
        }
      }
    }
  });

  test('OpenAPI spec does not have additional non-streaming endpoints', () => {
    // Get all the paths defined in the OpenAPI spec
    const specPaths = openApiSpec.paths || {};
    
    // Convert endpointsToValidate to a set of strings for easier lookup
    const validationEndpointStrings = new Set(
      endpointsToValidate.map(e => `${e.method.toLowerCase()} ${apiPathToOpenApiPath(e.path)}`)
    );
    
    // Also add streaming endpoints to ignore
    const streamingEndpointStrings = new Set([
      'post /system/sessions/{sessionId}/stream',
      'post /workspaces/{workspaceId}/sessions/{sessionId}/stream'
    ]);
    
    // Check for paths in the spec that aren't in our validation list
    const extraEndpoints: string[] = [];
    
    for (const path in specPaths) {
      const pathSpec = specPaths[path];
      
      for (const method in pathSpec) {
        // Skip non-HTTP method properties
        if (!['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
          continue;
        }
        
        const endpointString = `${method} ${path}`;
        
        // If this is not in our validation list and not a streaming endpoint
        if (!validationEndpointStrings.has(endpointString) && !streamingEndpointStrings.has(endpointString)) {
          extraEndpoints.push(endpointString);
        }
      }
    }
    
    // We expect no extra endpoints
    expect(extraEndpoints).toEqual([], 
      `Found endpoints in OpenAPI spec that aren't in validation list: ${extraEndpoints.join(', ')}`);
  });
});