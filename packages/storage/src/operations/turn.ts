import { prisma } from '..';
import type { Turn } from '@prisma/client';

export async function newToolCallTurn(
  responseId: string,
  index: number,
  server: string,
  toolName: string,
  input: any
): Promise<Turn> {
  return prisma.turn.create({
    data: {
      responseId,
      index,
      toolCall: {
        server,
        name: toolName,
        input,
      }
    }
  });
}

export async function newToolResultTurn(
  responseId: string,
  index: number,
  result: any
): Promise<Turn> {
  return prisma.turn.create({
    data: {
      responseId,
      index,
      toolResult: result
    }
  });
}

export async function newContentTurn(
  responseId: string,
  index: number,
  content: string
): Promise<Turn> {
  return prisma.turn.create({
    data: {
      responseId,
      index,
      content
    }
  });
}