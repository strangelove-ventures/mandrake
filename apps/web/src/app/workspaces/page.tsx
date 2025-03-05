import { AppShell } from '@/components/client/layouts';
import { WorkspacesList } from '@/components/client/workspaces';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default function WorkspacesPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Workspaces</h1>
            <p className="text-muted-foreground">
              Manage your AI project workspaces
            </p>
          </div>
          
          <Button asChild>
            <Link href="/workspaces/new">
              <Plus className="mr-1 h-4 w-4" />
              New Workspace
            </Link>
          </Button>
        </div>
        
        <WorkspacesList />
      </div>
    </AppShell>
  );
}
