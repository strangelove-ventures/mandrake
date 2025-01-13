import { type Chain } from './index';

describe('Chain Interface', () => {
  it('should define the required method', () => {
    const mockChain: Chain = {
      execute: async (input: string) => `processed: ${input}`
    };
    
    expect(mockChain.execute).toBeDefined();
  });
  
  it('should process input correctly', async () => {
    const mockChain: Chain = {
      execute: async (input: string) => `processed: ${input}`
    };
    
    const result = await mockChain.execute('test');
    expect(result).toBe('processed: test');
  });
});