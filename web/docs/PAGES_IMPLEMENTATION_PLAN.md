# Pages Implementation Plan

## Overview

This plan outlines the page structure for the Mandrake frontend. Using Next.js App Router, we'll create a hierarchy of pages that provide a consistent user experience while maintaining clear separation of concerns. Each page will utilize the components and widgets defined in the UI Components Implementation Plan.

## Key Requirements

1. Intuitive navigation flow between pages
2. Responsive layouts that work well on different screen sizes
3. Effective loading and error states
4. Consistent breadcrumb navigation
5. Clean URL structure that reflects the application hierarchy

## Page Structure

```
web/src/app/
├── page.tsx                            # Home / Dashboard
├── layout.tsx                          # Root layout with providers
├── settings/
│   └── page.tsx                        # Global settings
├── workspaces/
│   ├── page.tsx                        # Workspaces list
│   └── [id]/
│       ├── page.tsx                    # Workspace overview
│       ├── layout.tsx                  # Workspace layout
│       ├── settings/
│       │   └── page.tsx                # Workspace settings
│       ├── tools/
│       │   ├── page.tsx                # Tools overview
│       │   └── [toolId]/
│       │       └── page.tsx            # Tool detail
│       ├── models/
│       │   └── page.tsx                # Models configuration
│       ├── files/
│       │   └── page.tsx                # File explorer
│       ├── dynamic/
│       │   └── page.tsx                # Dynamic context config
│       ├── prompt/
│       │   └── page.tsx                # Prompt configuration
│       └── sessions/
│           ├── page.tsx                # Sessions list
│           └── [sessionId]/
│               └── page.tsx            # Session detail/chat
└── api/                                # API routes (defined separately)
```

## Implementation Approach

### 1. Root Layout

Create the root layout with providers:

```typescript
// web/src/app/layout.tsx
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import { AppLayout } from '@/components/layouts/AppLayout';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Mandrake',
  description: 'An extensible AI agent platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
```

### 2. Home / Dashboard Page

Create the home dashboard page:

```typescript
// web/src/app/page.tsx
import { Suspense } from 'react';
import { WorkspaceGrid } from '@/components/workspaces/WorkspaceGrid';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CreateWorkspaceModal } from '@/components/modals/CreateWorkspaceModal';
import { useModalStore } from '@/lib/stores/ui/modals';
import { useWorkspaces } from '@/lib/api-client/hooks/useWorkspaces';

export default function HomePage() {
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Workspaces</h1>
        <CreateWorkspaceButton />
      </div>
      
      <Suspense fallback={<LoadingSpinner size="lg" className="mx-auto mt-12" />}>
        <WorkspaceGridWrapper />
      </Suspense>
      
      <CreateWorkspaceModal />
    </div>
  );
}

function CreateWorkspaceButton() {
  const { openModal } = useModalStore();
  
  return (
    <Button onClick={() => openModal('createWorkspace')}>
      <Plus className="mr-2 h-4 w-4" />
      New Workspace
    </Button>
  );
}

function WorkspaceGridWrapper() {
  const { data: workspaces = [], error } = useWorkspaces();
  
  if (error) {
    return (
      <EmptyState
        icon="error"
        title="Error loading workspaces"
        description="Failed to load workspaces. Please try again."
        action={<Button onClick={() => window.location.reload()}>Retry</Button>}
      />
    );
  }
  
  if (workspaces.length === 0) {
    return (
      <EmptyState
        icon="folder"
        title="No workspaces"
        description="Create a workspace to get started with Mandrake."
        action={
          <Button onClick={() => useModalStore.getState().openModal('createWorkspace')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Workspace
          </Button>
        }
      />
    );
  }
  
  return <WorkspaceGrid workspaces={workspaces} />;
}
```

### 3. Workspace Layout

Create the workspace-specific layout:

```typescript
// web/src/app/workspaces/[id]/layout.tsx
import { useEffect } from 'react';
import { notFound } from 'next/navigation';
import { WorkspaceLayout } from '@/components/layouts/WorkspaceLayout';
import { WorkspaceTabs } from '@/components/workspaces/WorkspaceTabs';
import { useWorkspace } from '@/lib/api-client/hooks/useWorkspaces';
import { useCurrentWorkspaceStore } from '@/lib/stores/workspace/current';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Loader2 } from 'lucide-react';

export default function WorkspacePageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  return (
    <ErrorBoundary>
      <WorkspaceLayoutWrapper id={params.id}>
        {children}
      </WorkspaceLayoutWrapper>
    </ErrorBoundary>
  );
}

function WorkspaceLayoutWrapper({
  children,
  id,
}: {
  children: React.ReactNode;
  id: string;
}) {
  const { data: workspace, isLoading, error } = useWorkspace(id);
  const { setCurrentWorkspace } = useCurrentWorkspaceStore();
  
  useEffect(() => {
    if (workspace) {
      setCurrentWorkspace(id);
    }
    
    return () => {
      setCurrentWorkspace(null);
    };
  }, [workspace, id, setCurrentWorkspace]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  
  if (error || !workspace) {
    notFound();
  }
  
  return (
    <WorkspaceLayout workspaceId={id} workspaceName={workspace.name}>
      <WorkspaceTabs workspaceId={id} />
      {children}
    </WorkspaceLayout>
  );
}
```

### 4. Workspace Overview Page

Create the workspace overview page with widgets:

```typescript
// web/src/app/workspaces/[id]/page.tsx
import { Suspense } from 'react';
import { WidgetCard } from '@/components/widgets/WidgetCard';
import { WorkspaceConfigWidget } from '@/components/widgets/WorkspaceConfigWidget';
import { ToolsWidget } from '@/components/widgets/ToolsWidget';
import { FilesWidget } from '@/components/widgets/FilesWidget';
import { ModelsWidget } from '@/components/widgets/ModelsWidget';
import { DynamicContextWidget } from '@/components/widgets/DynamicContextWidget';
import { PromptWidget } from '@/components/widgets/PromptWidget';
import { MCPServersWidget } from '@/components/widgets/MCPServersWidget';
import { SessionsWidget } from '@/components/widgets/SessionsWidget';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function WorkspaceOverviewPage({ params }: { params: { id: string } }) {
  const workspaceId = params.id;
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Workspace Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <WidgetWrapper>
          <WidgetCard title="Workspace Settings">
            <WorkspaceConfigWidget workspaceId={workspaceId} />
          </WidgetCard>
        </WidgetWrapper>
        
        <WidgetWrapper>
          <WidgetCard title="Recent Sessions">
            <SessionsWidget workspaceId={workspaceId} />
          </WidgetCard>
        </WidgetWrapper>
        
        <WidgetWrapper>
          <WidgetCard title="Tools">
            <ToolsWidget workspaceId={workspaceId} />
          </WidgetCard>
        </WidgetWrapper>
        
        <WidgetWrapper>
          <WidgetCard title="Files">
            <FilesWidget workspaceId={workspaceId} />
          </WidgetCard>
        </WidgetWrapper>
        
        <WidgetWrapper>
          <WidgetCard title="Models">
            <ModelsWidget workspaceId={workspaceId} />
          </WidgetCard>
        </WidgetWrapper>
        
        <WidgetWrapper>
          <WidgetCard title="Dynamic Context">
            <DynamicContextWidget workspaceId={workspaceId} />
          </WidgetCard>
        </WidgetWrapper>
        
        <WidgetWrapper>
          <WidgetCard title="Prompt">
            <PromptWidget workspaceId={workspaceId} />
          </WidgetCard>
        </WidgetWrapper>
        
        <WidgetWrapper className="md:col-span-2">
          <WidgetCard title="MCP Servers">
            <MCPServersWidget workspaceId={workspaceId} />
          </WidgetCard>
        </WidgetWrapper>
      </div>
    </div>
  );
}

function WidgetWrapper({ 
  children, 
  className = '',
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Suspense fallback={<WidgetSkeleton />}>
        {children}
      </Suspense>
    </div>
  );
}

function WidgetSkeleton() {
  return (
    <div className="bg-card border rounded-lg p-4 h-64 flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
```

### 5. Session Detail Page

Create the session detail page with chat interface:

```typescript
// web/src/app/workspaces/[id]/sessions/[sessionId]/page.tsx
import { Suspense, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { MessageList } from '@/components/session/MessageList';
import { UserInput } from '@/components/session/UserInput';
import { SessionHeader } from '@/components/session/SessionHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useSession } from '@/lib/api-client/hooks/useSessions';
import { useActiveSessionStore } from '@/lib/stores/session/active';
import { useMessagesStore } from '@/lib/stores/session/messages';

export default function SessionDetailPage({ 
  params 
}: { 
  params: { id: string; sessionId: string } 
}) {
  return (
    <Suspense fallback={<SessionPageSkeleton />}>
      <SessionDetailContent 
        workspaceId={params.id} 
        sessionId={params.sessionId} 
      />
    </Suspense>
  );
}

function SessionDetailContent({ 
  workspaceId, 
  sessionId 
}: { 
  workspaceId: string; 
  sessionId: string 
}) {
  const { data: session, isLoading, error } = useSession(workspaceId, sessionId);
  const { setActiveSession } = useActiveSessionStore();
  const messages = useMessagesStore((state) => 
    state.messages.get(sessionId) || []
  );
  
  useEffect(() => {
    if (session) {
      setActiveSession(sessionId);
    }
    
    return () => {
      setActiveSession(null);
    };
  }, [session, sessionId, setActiveSession]);
  
  if (error || (!isLoading && !session)) {
    notFound();
  }
  
  return (
    <div className="flex flex-col h-full">
      <SessionHeader 
        title={session?.title || 'New Session'} 
        workspaceId={workspaceId} 
        sessionId={sessionId} 
      />
      
      <div className="flex-1 overflow-auto">
        <MessageList 
          messages={messages} 
          isLoading={isLoading && messages.length === 0} 
        />
      </div>
      
      <div className="p-4 border-t">
        <UserInput 
          workspaceId={workspaceId} 
          sessionId={sessionId} 
        />
      </div>
    </div>
  );
}

function SessionPageSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <div className="h-6 bg-muted rounded w-1/3 animate-pulse"></div>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
      
      <div className="p-4 border-t">
        <div className="h-12 bg-muted rounded animate-pulse"></div>
      </div>
    </div>
  );
}
```

### 6. Settings Page

Create the global settings page:

```typescript
// web/src/app/settings/page.tsx
import { Suspense } from 'react';
import { WidgetCard } from '@/components/widgets/WidgetCard';
import { GlobalToolsConfigWidget } from '@/components/widgets/GlobalToolsConfigWidget';
import { GlobalModelsConfigWidget } from '@/components/widgets/GlobalModelsConfigWidget';
import { SystemConfigWidget } from '@/components/widgets/SystemConfigWidget';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function SettingsPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Global Settings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <WidgetWrapper>
          <WidgetCard title="Global Tools">
            <GlobalToolsConfigWidget />
          </WidgetCard>
        </WidgetWrapper>
        
        <WidgetWrapper>
          <WidgetCard title="Global Models">
            <GlobalModelsConfigWidget />
          </WidgetCard>
        </WidgetWrapper>
        
        <WidgetWrapper>
          <WidgetCard title="System Settings">
            <SystemConfigWidget />
          </WidgetCard>
        </WidgetWrapper>
      </div>
    </div>
  );
}

function WidgetWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="bg-card border rounded-lg p-4 h-64 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    }>
      {children}
    </Suspense>
  );
}
```

### 7. Tools Overview Page

Create the tools overview page:

```typescript
// web/src/app/workspaces/[id]/tools/page.tsx
import { Suspense } from 'react';
import { ToolList } from '@/components/tools/ToolList';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { useTools } from '@/lib/api-client/hooks/useTools';
import { useModalStore } from '@/lib/stores/ui/modals';
import { AddToolModal } from '@/components/modals/AddToolModal';

export default function ToolsPage({ params }: { params: { id: string } }) {
  const workspaceId = params.id;
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tools</h1>
        <AddToolButton workspaceId={workspaceId} />
      </div>
      
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      }>
        <ToolsContent workspaceId={workspaceId} />
      </Suspense>
      
      <AddToolModal />
    </div>
  );
}

function AddToolButton({ workspaceId }: { workspaceId: string }) {
  const { openModal } = useModalStore();
  
  return (
    <Button onClick={() => openModal('addTool', { workspaceId })}>
      <Plus className="mr-2 h-4 w-4" />
      Add Tool
    </Button>
  );
}

function ToolsContent({ workspaceId }: { workspaceId: string }) {
  const { data: tools = [], error } = useTools(workspaceId);
  const { openModal } = useModalStore();
  
  if (error) {
    return (
      <EmptyState
        icon="error"
        title="Error loading tools"
        description="Failed to load tools. Please try again."
        action={<Button onClick={() => window.location.reload()}>Retry</Button>}
      />
    );
  }
  
  if (tools.length === 0) {
    return (
      <EmptyState
        icon="tools"
        title="No tools configured"
        description="Add tools to enhance Mandrake's capabilities."
        action={
          <Button onClick={() => openModal('addTool', { workspaceId })}>
            <Plus className="mr-2 h-4 w-4" />
            Add Tool
          </Button>
        }
      />
    );
  }
  
  return (
    <ToolList 
      tools={tools} 
      onConfigureTool={(toolId) => 
        openModal('configureTool', { workspaceId, toolId })
      } 
    />
  );
}
```

### 8. Files Explorer Page

Create the files explorer page:

```typescript
// web/src/app/workspaces/[id]/files/page.tsx
import { Suspense } from 'react';
import { FileExplorer } from '@/components/files/FileExplorer';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useModalStore } from '@/lib/stores/ui/modals';
import { FileUploadModal } from '@/components/modals/FileUploadModal';
import { FilePreviewModal } from '@/components/modals/FilePreviewModal';

export default function FilesPage({ params }: { params: { id: string } }) {
  const workspaceId = params.id;
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Files</h1>
        <UploadButton workspaceId={workspaceId} />
      </div>
      
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      }>
        <FileExplorer workspaceId={workspaceId} />
      </Suspense>
      
      <FileUploadModal />
      <FilePreviewModal />
    </div>
  );
}

function UploadButton({ workspaceId }: { workspaceId: string }) {
  const { openModal } = useModalStore();
  
  return (
    <Button onClick={() => openModal('fileUpload', { workspaceId })}>
      <Upload className="mr-2 h-4 w-4" />
      Upload
    </Button>
  );
}
```

## Error and Not Found Pages

### Not Found Page

```typescript
// web/src/app/not-found.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <h2 className="text-xl mb-4">Page Not Found</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/" passHref>
        <Button>
          <Home className="mr-2 h-4 w-4" />
          Return Home
        </Button>
      </Link>
    </div>
  );
}
```

### Error Page

```typescript
// web/src/app/error.tsx
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
      <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        An unexpected error occurred. Please try again.
      </p>
      <Button onClick={reset}>
        Try Again
      </Button>
    </div>
  );
}
```

## Page Routing and Navigation

### Creating a Navigation Component

```typescript
// web/src/components/common/Navigation.tsx
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Settings, 
  FolderOpen, 
  Wrench, 
  Database, 
  FileText, 
  MessageSquare, 
  Command 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentWorkspaceStore } from '@/lib/stores/workspace/current';

export function Navigation() {
  const pathname = usePathname();
  const { currentWorkspaceId } = useCurrentWorkspaceStore();
  
  // Global navigation items that are always shown
  const globalItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];
  
  // Workspace-specific navigation items, only shown when in a workspace
  const workspaceItems = currentWorkspaceId
    ? [
        { 
          href: `/workspaces/${currentWorkspaceId}`, 
          label: 'Overview', 
          icon: FolderOpen 
        },
        { 
          href: `/workspaces/${currentWorkspaceId}/tools`, 
          label: 'Tools', 
          icon: Wrench 
        },
        { 
          href: `/workspaces/${currentWorkspaceId}/files`, 
          label: 'Files', 
          icon: FileText 
        },
        { 
          href: `/workspaces/${currentWorkspaceId}/models`, 
          label: 'Models', 
          icon: Database 
        },
        { 
          href: `/workspaces/${currentWorkspaceId}/sessions`, 
          label: 'Sessions', 
          icon: MessageSquare 
        },
        { 
          href: `/workspaces/${currentWorkspaceId}/prompt`, 
          label: 'Prompt', 
          icon: Command 
        },
      ]
    : [];
  
  return (
    <nav className="space-y-6">
      <div className="space-y-1">
        {globalItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={pathname === item.href}
          />
        ))}
      </div>
      
      {workspaceItems.length > 0 && (
        <>
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2 px-3">
              Workspace
            </h3>
            <div className="space-y-1">
              {workspaceItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  isActive={pathname === item.href}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </nav>
  );
}

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
}

function NavItem({ href, label, icon: Icon, isActive }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center py-2 px-3 text-sm rounded-md',
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-muted'
      )}
    >
      <Icon className="w-4 h-4 mr-2" />
      {label}
    </Link>
  );
}
```

## Next Steps

1. Create the base layout components
2. Implement the homepage with workspaces list
3. Build the workspace layout and overview page
4. Implement the session detail page
5. Create the settings page
6. Build the tools, files, and model pages
7. Implement error and not found pages
8. Create navigation components

## Timeline

- Day 1: Create the base layout and homepage
- Day 2: Implement workspace layout and overview
- Day 3: Build session pages
- Day 4: Create settings and configuration pages
- Day 5: Implement tools, files, and models pages
- Day 6: Add error handling and not found pages
- Day 7: Test and refine all pages
