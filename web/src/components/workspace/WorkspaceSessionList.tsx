'use client';

import { useState } from 'react';
import { useSessions, useCreateSession } from '@/hooks/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface WorkspaceSessionListProps {
  workspaceId: string;
  onSelectSession: (sessionId: string) => void;
}

export default function WorkspaceSessionList({ workspaceId, onSelectSession }: WorkspaceSessionListProps) {
  const { data: sessions, isLoading, refetch } = useSessions(workspaceId);
  const createSession = useCreateSession(workspaceId);
  
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Handle new session creation
  const handleCreateSession = async () => {
    try {
      await createSession.mutateAsync({
        title: newSessionTitle || 'New Session',
        description: '',
        metadata: {}
      });
      setNewSessionTitle('');
      setIsCreating(false);
      refetch();
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Workspace Sessions</CardTitle>
        <Button 
          onClick={() => setIsCreating(!isCreating)}
          variant="outline"
          size="sm"
        >
          {isCreating ? 'Cancel' : 'New Session'}
        </Button>
      </CardHeader>
      
      <CardContent>
        {/* New session form */}
        {isCreating && (
          <div className="mb-4 p-4 border border-dashed rounded-md border-gray-300 dark:border-gray-600 flex gap-2">
            <Input
              placeholder="Session Title"
              value={newSessionTitle}
              onChange={(e) => setNewSessionTitle(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleCreateSession} 
              disabled={createSession.isPending}
            >
              {createSession.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        )}
        
        {/* Sessions list */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i} 
                className="h-16 bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse"
              />
            ))}
          </div>
        ) : sessions && sessions.length > 0 ? (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                onClick={() => onSelectSession(session.id)}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium">{session.title}</h3>
                  <Badge variant="outline" className="text-xs">
                    {new Date(session.createdAt).toLocaleDateString()}
                  </Badge>
                </div>
                {session.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {session.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <p>No sessions found.</p>
            <p className="text-sm">Create a new session to get started.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
