import { type Repository } from './index';

interface TestEntity {
  id: string;
  name: string;
}

describe('Repository Interface', () => {
  it('should implement the repository methods', async () => {
    const mockRepo: Repository<TestEntity> = {
      find: async (id: string) => ({ id, name: 'test' }),
      save: async (entity: TestEntity) => {}
    };
    
    expect(mockRepo.find).toBeDefined();
    expect(mockRepo.save).toBeDefined();
  });
  
  it('should handle basic operations', async () => {
    const mockRepo: Repository<TestEntity> = {
      find: async (id: string) => ({ id, name: 'test' }),
      save: async (entity: TestEntity) => {}
    };
    
    const entity = await mockRepo.find('123');
    expect(entity).toEqual({ id: '123', name: 'test' });
  });
});