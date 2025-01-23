export interface Workspace {
    id: string;
    name: string;
    description?: string;
    config?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}