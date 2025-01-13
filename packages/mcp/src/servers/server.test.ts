import { type MCPServer } from './index';

describe('MCPServer Interface', () => {
  it('should implement the required methods', async () => {
    const mockServer: MCPServer = {
      connect: async () => {},
      invoke: async (input: string) => `response: ${input}`
    };
    
    expect(mockServer.connect).toBeDefined();
    expect(mockServer.invoke).toBeDefined();
  });
  
  it('should handle invocations', async () => {
    const mockServer: MCPServer = {
      connect: async () => {},
      invoke: async (input: string) => `response: ${input}`
    };
    
    const response = await mockServer.invoke('test');
    expect(response).toBe('response: test');
  });
});