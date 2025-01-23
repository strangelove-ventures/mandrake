import { prisma } from '..';

export interface MessageFormat {
  role: 'user' | 'assistant';
  content: string;
}

export async function getSessionMessages(sessionId: string): Promise<MessageFormat[]> {
  const rounds = await prisma.round.findMany({
    where: { sessionId },
    orderBy: { index: 'asc' },
    include: {
      request: true,
      response: {
        include: {
          turns: {
            orderBy: {
              index: 'asc'
            }
          }
        }
      }
    }
  });

  return rounds.flatMap(round => [
    { role: 'user' as const, content: round.request.content },
    {
      role: 'assistant' as const,
      content: round.response.turns
        .map(turn => turn.content || JSON.stringify({
          content: [{
            type: 'tool_use',
            name: (turn.toolCall as any)?.name,
            input: (turn.toolCall as any)?.input
          }]
        }))
        .join('')
    }
  ]);
}