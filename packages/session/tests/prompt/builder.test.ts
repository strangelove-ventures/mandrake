import { describe, test, expect } from 'bun:test';
import { SystemPromptBuilder } from '../../src/prompt/builder';

describe('SystemPromptBuilder', () => {
  test('builds basic prompt with instructions only', () => {
    const builder = new SystemPromptBuilder({
      instructions: 'Test instructions'
    });

    const prompt = builder.buildPrompt();
    
    // Should have proper XML structure with newlines
    expect(prompt).toMatch(/<instructions>\nTest instructions\n<\/instructions>/);
    
    // Should have datetime by default
    expect(prompt).toMatch(/<datetime>\n.*?\n<\/datetime>/s);
    
    // Should not have optional sections
    expect(prompt).not.toContain('<tools>');
    expect(prompt).not.toContain('<workspace>');
    expect(prompt).not.toContain('<system>');
  });

  test('builds complete prompt with all sections', () => {
    const builder = new SystemPromptBuilder({
      instructions: 'Test instructions',
      tools: {
        tools: [{
          name: 'test_tool',
          description: 'Test tool',
          inputSchema: {
            type: 'object',
            properties: {
              test: { type: 'string' }
            }
          }
        }]
      },
      metadata: {
        workspaceName: 'test-workspace',
        workspacePath: '/path/to/workspace'
      },
      systemInfo: {
        os: 'test-os',
        arch: 'test-arch'
      },
      dateConfig: {
        includeTime: true
      }
    });

    const prompt = builder.buildPrompt();
    
    // XML formatting validation
    expect(prompt.split('\n\n').length).toBeGreaterThan(1); // Sections should be separated by double newlines
    
    // Check instructions format
    const instructionsMatch = prompt.match(/<instructions>\n(.*?)\n<\/instructions>/s);
    expect(instructionsMatch).toBeTruthy();
    expect(instructionsMatch![1]).toBe('Test instructions');
    
    // Check tools format
    const toolsMatch = prompt.match(/<tools>\n(.*?)\n<\/tools>/s);
    expect(toolsMatch).toBeTruthy();
    expect(toolsMatch![1]).toContain('name: test_tool');
    expect(toolsMatch![1]).toContain('description: Test tool');
    expect(toolsMatch![1]).toContain('"type": "object"');
    
    // Check metadata format
    const workspaceMatch = prompt.match(/<workspace>\n(.*?)\n<\/workspace>/s);
    expect(workspaceMatch).toBeTruthy();
    expect(workspaceMatch![1]).toContain('name: test-workspace');
    expect(workspaceMatch![1]).toContain('path: /path/to/workspace');
    
    // Check system info format
    const systemMatch = prompt.match(/<system>\n(.*?)\n<\/system>/s);
    expect(systemMatch).toBeTruthy();
    expect(systemMatch![1]).toContain('os: test-os');
    expect(systemMatch![1]).toContain('arch: test-arch');
    
    // Check datetime format with time
    const dateMatch = prompt.match(/<datetime>\n(.*?)\n<\/datetime>/s);
    expect(dateMatch).toBeTruthy();
    expect(dateMatch![1]).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO format check
  });

  test('handles empty tools section', () => {
    const builder = new SystemPromptBuilder({
      instructions: 'Test instructions',
      tools: {
        tools: []
      }
    });

    const prompt = builder.buildPrompt();
    
    expect(prompt).not.toContain('<tools>');
    expect(prompt).toMatch(/<instructions>\nTest instructions\n<\/instructions>/);
  });

  test('handles multiple tools properly', () => {
    const builder = new SystemPromptBuilder({
      instructions: 'Test instructions',
      tools: {
        tools: [
          {
            name: 'tool1',
            description: 'First tool'
          },
          {
            name: 'tool2',
            description: 'Second tool'
          }
        ]
      }
    });

    const prompt = builder.buildPrompt();
    const toolsMatch = prompt.match(/<tools>\n(.*?)\n<\/tools>/s);
    
    expect(toolsMatch).toBeTruthy();
    expect(toolsMatch![1]).toContain('name: tool1');
    expect(toolsMatch![1]).toContain('description: First tool');
    expect(toolsMatch![1]).toContain('name: tool2');
    expect(toolsMatch![1]).toContain('description: Second tool');
  });

  test('datetime section format varies with includeTime option', () => {
    // Without time
    const withoutTime = new SystemPromptBuilder({
      instructions: 'Test',
      dateConfig: { includeTime: false }
    });
    const withoutTimePrompt = withoutTime.buildPrompt();
    expect(withoutTimePrompt).toMatch(/<datetime>\n[A-Za-z]+ \d{1,2}, \d{4}\n<\/datetime>/);

    // With time
    const withTime = new SystemPromptBuilder({
      instructions: 'Test',
      dateConfig: { includeTime: true }
    });
    const withTimePrompt = withTime.buildPrompt();
    expect(withTimePrompt).toMatch(/<datetime>\n\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*\n<\/datetime>/);
  });
});