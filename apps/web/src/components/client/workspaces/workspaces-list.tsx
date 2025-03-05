'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useWorkspacesStore } from '@/store';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderOpen, Plus, Trash } from 'lucide-react';

export function WorkspacesList() {
  const { workspaces, isLoading, error, fetchWorkspaces } = useWorkspacesStore();
  
  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);
  
  if (isLoading && workspaces.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <p className="text-muted-foreground">Loading workspaces...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 mb-4">
        <p className="text-destructive font-medium">Error loading workspaces</p>
        <p className="text-destructive/80 text-sm">{error}</p>
      </div>
    );
  }
  
  if (workspaces.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="flex justify-center mb-4">
          <FolderOpen className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No workspaces yet</h3>
        <p className="text-muted-foreground mb-6">
          Create a new workspace to get started with your AI projects.
        </p>
        <Button asChild>
          <Link href="/workspaces/new">
            <Plus className="mr-1 h-4 w-4" />
            Create New Workspace
          </Link>
        </Button>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {workspaces.map((workspace) => (
        <WorkspaceCard key={workspace.id} workspace={workspace} />
      ))}
    </div>
  );
}

interface WorkspaceCardProps {
  workspace: {
    id: string;
    name: string;
    description?: string;
    updatedAt?: string;
  };
}

function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  const { deleteWorkspace } = useWorkspacesStore();
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm('Are you sure you want to delete this workspace?')) {
      try {
        await deleteWorkspace(workspace.id);
      } catch (error) {
        // Error handling is managed in the store
      }
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{workspace.name}</CardTitle>
        <CardDescription>{workspace.description || 'No description'}</CardDescription>
      </CardHeader>
      <CardContent>
        {workspace.updatedAt && (
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date(workspace.updatedAt).toLocaleDateString()}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button asChild variant="secondary">
          <Link href={`/workspaces/${workspace.id}`}>
            Open
          </Link>
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-destructive hover:text-destructive hover:bg-destructive/10" 
          onClick={handleDelete}
        >
          <Trash className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
