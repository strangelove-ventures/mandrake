import { Request } from './request';
import { Response } from './response';

export interface Round {
    id: string;
    sessionId: string;
    request: Request;
    response: Response;
    index: number;
    createdAt: string;
    updatedAt: string;
}