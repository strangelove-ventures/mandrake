import { AppShell } from '@/components/client/layouts';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface WorkspacePageProps {
  params: {
    id: string;
  };
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  const { id } = params;
  
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
          <h1 className="text-3xl font-bold">Workspace</h1>
        </div>
        
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="dynamic">Dynamic Context</TabsTrigger>
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="p-4 border rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Workspace Overview</h2>
              <p className="text-muted-foreground">
                Workspace ID: {id}
              </p>
              <p className="text-muted-foreground">
                This is a placeholder for the workspace overview.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="sessions">
            <div className="p-4 border rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Sessions</h2>
              <p className="text-muted-foreground">
                No sessions available yet.
              </p>
              <Button asChild className="mt-4">
                <Link href={`/workspaces/${id}/sessions/new`}>
                  Create New Session
                </Link>
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="tools">
            <div className="p-4 border rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Tools</h2>
              <p className="text-muted-foreground">
                Tool configuration will be implemented here.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="models">
            <div className="p-4 border rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Models</h2>
              <p className="text-muted-foreground">
                Model configuration will be implemented here.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="dynamic">
            <div className="p-4 border rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Dynamic Context</h2>
              <p className="text-muted-foreground">
                Dynamic context configuration will be implemented here.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="prompt">
            <div className="p-4 border rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Prompt</h2>
              <p className="text-muted-foreground">
                Prompt configuration will be implemented here.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="files">
            <div className="p-4 border rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Files</h2>
              <p className="text-muted-foreground">
                File management will be implemented here.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
