import { Turn } from './turn';

export interface Response {
    id: string;
    turns: Turn[];
    createdAt: string;
    updatedAt: string;
}