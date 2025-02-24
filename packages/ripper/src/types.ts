import { z } from 'zod';

export interface SecurityContext {
  allowedDirs: string[];
  excludePatterns: string[];
}