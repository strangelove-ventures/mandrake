import type { Message } from '@mandrake/provider';
import type { Session, Round, Request, Response, Turn } from '@mandrake/workspace';

interface SessionHistory {
  session: Session;
  rounds: (Round & {
    request: Request;
    response: Response & {
      turns: Turn[];
    };
  })[];
}

export function convertSessionToMessages(history: SessionHistory): Message[] {
  const messages: Message[] = [];
  
  for (const round of history.rounds) {
    // Add user message
    messages.push({
      role: 'user',
      content: round.request.content
    });

    // Process response turns
    let assistantContent = '';
    for (const turn of round.response.turns) {
      // Add content from turn
      if (turn.content) {
        assistantContent += JSON.parse(turn.content).join('');
      }

      // Add tool calls if present
      if (turn.toolCalls) {
        const toolCalls = JSON.parse(turn.toolCalls);
        for (const {call, result} of toolCalls) {
          assistantContent += `\nTool Call: ${call.name}\n`;
          assistantContent += `Arguments: ${JSON.stringify(call.arguments)}\n`;
          assistantContent += `Result: ${JSON.stringify(result)}\n`;
        }
      }
    }

    if (assistantContent) {
      messages.push({
        role: 'assistant',
        content: assistantContent.trim()
      });
    }
  }

  return messages;
}
