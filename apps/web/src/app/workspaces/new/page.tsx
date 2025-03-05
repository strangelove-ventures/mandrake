import { AppShell } from '@/components/client/layouts';
import { WorkspaceCreator } from '@/components/client/workspaces';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewWorkspacePage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/workspaces">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Create Workspace</h1>
        </div>
        
        <div className="max-w-2xl mx-auto">
          <WorkspaceCreator />
        </div>
      </div>
    </AppShell>
  );
}
