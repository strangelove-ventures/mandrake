import { prisma } from '..';
import type { Round } from '@prisma/client';

export interface RoundWithRelations extends Round {
  request: { content: string };
  response: { id: string };
}

export async function newRoundForSession(
  sessionId: string,
  message: string
): Promise<RoundWithRelations> {
  // Create response first
  const response = await prisma.response.create({
    data: {}
  });

  // Create request
  const request = await prisma.request.create({
    data: {
      content: message,
    }
  });

  // Get next index
  const lastRound = await prisma.round.findFirst({
    where: { sessionId },
    orderBy: { index: 'desc' },
  });
  const index = (lastRound?.index ?? -1) + 1;

  // Create and return round with related objects
  return prisma.round.create({
    data: {
      sessionId,
      index,
      requestId: request.id,
      responseId: response.id,
    },
    include: {
      request: true,
      response: true
    }
  });
}