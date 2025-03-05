import { NextResponse } from 'next/server';

// Set the route to run on the server only
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Mock data for testing the UI while developing
const mockSessions = [
  {
    id: 'session-1',
    name: 'GPT Chat',
    description: 'General conversation with GPT',
    modelId: 'gpt-4',
    createdAt: '2023-05-10T12:30:00Z',
    updatedAt: '2023-05-10T14:25:00Z',
  },
  {
    id: 'session-2',
    name: 'Research Assistant',
    description: 'Help with academic research',
    modelId: 'claude-3',
    createdAt: '2023-05-15T15:45:00Z',
    updatedAt: '2023-05-15T16:20:00Z',
  },
  {
    id: 'session-3',
    name: 'Code Review',
    description: 'Assistant for reviewing code',
    modelId: 'claude-3',
    createdAt: '2023-05-18T09:15:00Z',
    updatedAt: '2023-05-18T11:30:00Z',
  }
];

export async function GET() {
  return NextResponse.json(mockSessions);
}

export async function POST(request: Request) {
  const body = await request.json();
  
  // Create a new mock session
  const newSession = {
    id: `session-${Date.now()}`,
    name: body.name,
    description: body.description || '',
    modelId: body.modelId || 'gpt-4',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  return NextResponse.json(newSession, { status: 201 });
}
