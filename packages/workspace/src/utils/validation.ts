import { z } from 'zod';

export const workspaceNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9-_]*$/, {
    message: "Workgitspace name must start with a letter or number and can only contain letters, numbers, hyphens, and underscores"
  });

export function validateWorkspaceName(name: string): void {
  workspaceNameSchema.parse(name);
}

export class WorkspaceNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkspaceNameError';
  }
}