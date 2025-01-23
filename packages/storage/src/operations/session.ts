import { prisma } from '..';
import type { Session } from '@prisma/client';

export async function getOrCreateSession(
  workspaceId: string,
  sessionId?: string,
  title?: string
): Promise<Session> {
  if (sessionId) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new Error('Session not found');
    return session;
  }

  return prisma.session.create({
    data: {
      title: title || 'New Session',
      workspaceId,
    },
  });
}