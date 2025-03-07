# UI Components Implementation Plan

## Overview

This plan outlines the UI component architecture for the Mandrake frontend. We'll use a combination of shadcn/ui components for the basic UI elements and custom components for Mandrake-specific functionality. The component structure will follow a hierarchical approach with widgets as the primary units of composition.

## Key Requirements

1. Consistent design system using shadcn/ui as a foundation
2. Widget-based architecture for encapsulating functionality
3. Responsive layouts that work well on different screen sizes
4. Support for both dark and light modes
5. Efficient data loading with suspense boundaries
6. Reusable components that work across different contexts (workspace and system)
7. Consistent error handling and loading states

## Component Structure

```
web/src/components/
├── layouts/                  # Page layouts
│   ├── AppLayout.tsx         # Main application layout
│   ├── WorkspaceLayout.tsx   # Workspace-specific layout
│   └── SessionLayout.tsx     # Session-specific layout
├── widgets/                  # Core functional widgets
│   ├── WidgetCard.tsx        # Base widget container
│   ├── WorkspaceConfigWidget.tsx
│   ├── ToolsWidget.tsx
│   ├── FilesWidget.tsx
│   ├── ModelsWidget.tsx
│   ├── DynamicContextWidget.tsx
│   ├── PromptWidget.tsx
│   ├── MCPServersWidget.tsx
│   ├── SessionsWidget.tsx
│   ├── GlobalToolsConfigWidget.tsx
│   ├── GlobalModelsConfigWidget.tsx
│   └── SystemConfigWidget.tsx
├── ui/                       # Low-level UI components (from shadcn)
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── input.tsx
│   ├── tabs.tsx
│   ├── toast.tsx
│   └── ... (other shadcn components)
├── common/                   # Shared utility components
│   ├── ErrorBoundary.tsx
│   ├── LoadingSpinner.tsx
│   ├── EmptyState.tsx
│   ├── SearchInput.tsx
│   └── Breadcrumbs.tsx
├── forms/                    # Form components
│   ├── WorkspaceForm.tsx
│   ├── ToolConfigForm.tsx
│   ├── ModelConfigForm.tsx
│   ├── PromptForm.tsx
│   └── DynamicContextForm.tsx
├── modals/                   # Modal dialogs
│   ├── CreateWorkspaceModal.tsx
│   ├── DeleteConfirmationModal.tsx
│   ├── AddToolModal.tsx
│   ├── ConfigureToolModal.tsx
│   ├── AddModelModal.tsx
│   └── FilePreviewModal.tsx
├── files/                    # File-related components
│   ├── FileTree.tsx
│   ├── FileIcon.tsx
│   ├── FilePreview.tsx
│   └── FileUploader.tsx
├── session/                  # Session-related components
│   ├── MessageList.tsx
│   ├── MessageItem.tsx
│   ├── UserInput.tsx
│   ├── SessionHeader.tsx
│   └── StreamingIndicator.tsx
└── tools/                    # Tool-related components
    ├── ToolList.tsx
    ├── ToolCard.tsx
    ├── ServerStatus.tsx
    └── LogViewer.tsx
```

## Implementation Approach

### 1. Base Layout Components

Create the base layout components first:

```typescript
// web/src/components/layouts/AppLayout.tsx
import React from 'react';
import { Sidebar } from '@/components/common/Sidebar';
import { Header } from '@/components/common/Header';
import { useLayoutStore } from '@/lib/stores/ui/layout';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isSidebarOpen, sidebarWidth } = useLayoutStore();
  
  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          className="flex-1 overflow-auto"
          style={{ marginLeft: isSidebarOpen ? `${sidebarWidth}px` : '0' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
```

### 2. Widget Card Component

Create a base widget card component that all widgets will extend:

```typescript
// web/src/components/widgets/WidgetCard.tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cog } from 'lucide-react';

interface WidgetCardProps {
  title: string;
  children: React.ReactNode;
  configurable?: boolean;
  onConfigClick?: () => void;
}

export function WidgetCard({
  title,
  children,
  configurable = false,
  onConfigClick,
}: WidgetCardProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">{title}</CardTitle>
        {configurable && (
          <Button variant="ghost" size="sm" onClick={onConfigClick}>
            <Cog size={16} />
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {children}
      </CardContent>
    </Card>
  );
}
```

### 3. Example Widget Implementation

Here's an example implementation of the Tools Widget:

```typescript
// web/src/components/widgets/ToolsWidget.tsx
import { useState } from 'react';
import { WidgetCard } from './WidgetCard';
import { ToolList } from '@/components/tools/ToolList';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTools } from '@/lib/api-client/hooks/useTools';
import { useModalStore } from '@/lib/stores/ui/modals';
import { ConfigureToolModal } from '@/components/modals/ConfigureToolModal';
import { AddToolModal } from '@/components/modals/AddToolModal';

interface ToolsWidgetProps {
  workspaceId?: string; // Optional - if not provided, shows system tools
}

export function ToolsWidget({ workspaceId }: ToolsWidgetProps) {
  const { openModal } = useModalStore();
  const { data: tools = [], isLoading, error } = useTools(workspaceId);
  
  const handleAddTool = () => {
    openModal('addTool', { workspaceId });
  };
  
  const handleConfigureTool = (toolId: string) => {
    openModal('configureTool', { workspaceId, toolId });
  };
  
  if (isLoading) {
    return (
      <WidgetCard title="Tools">
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner />
        </div>
      </WidgetCard>
    );
  }
  
  if (error) {
    return (
      <WidgetCard title="Tools">
        <EmptyState
          icon="error"
          title="Error loading tools"
          description="Failed to load tools. Please try again."
          action={<Button onClick={() => window.location.reload()}>Retry</Button>}
        />
      </WidgetCard>
    );
  }
  
  return (
    <>
      <WidgetCard 
        title="Tools" 
        configurable={true}
        onConfigClick={handleAddTool}
      >
        {tools.length > 0 ? (
          <ToolList 
            tools={tools} 
            onConfigureTool={handleConfigureTool} 
          />
        ) : (
          <EmptyState
            icon="tools"
            title="No tools configured"
            description="Add tools to enhance Mandrake's capabilities."
            action={
              <Button onClick={handleAddTool}>
                <Plus className="mr-2 h-4 w-4" />
                Add Tool
              </Button>
            }
          />
        )}
      </WidgetCard>
      
      <AddToolModal />
      <ConfigureToolModal />
    </>
  );
}
```

### 4. Modal Components

Create reusable modal components:

```typescript
// web/src/components/modals/ConfigureToolModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useModalStore } from '@/lib/stores/ui/modals';
import { ToolConfigForm } from '@/components/forms/ToolConfigForm';

export function ConfigureToolModal() {
  const { getModalState, closeModal } = useModalStore();
  const { isOpen, data } = getModalState('configureTool');
  
  const handleClose = () => {
    closeModal('configureTool');
  };
  
  if (!isOpen || !data) return null;
  
  const { workspaceId, toolId } = data;
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configure Tool</DialogTitle>
        </DialogHeader>
        <ToolConfigForm 
          workspaceId={workspaceId} 
          toolId={toolId} 
          onSuccess={handleClose} 
        />
      </DialogContent>
    </Dialog>
  );
}
```

### 5. Form Components

Create reusable form components:

```typescript
// web/src/components/forms/ToolConfigForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useUpdateTool, useGetTool } from '@/lib/api-client/hooks/useTools';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const toolFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  command: z.string().min(1, 'Command is required'),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  autoApprove: z.boolean().default(false),
});

type ToolFormValues = z.infer<typeof toolFormSchema>;

interface ToolConfigFormProps {
  workspaceId?: string;
  toolId: string;
  onSuccess?: () => void;
}

export function ToolConfigForm({ 
  workspaceId, 
  toolId, 
  onSuccess 
}: ToolConfigFormProps) {
  const { data: tool, isLoading } = useGetTool(workspaceId, toolId);
  const updateTool = useUpdateTool();
  
  const form = useForm<ToolFormValues>({
    resolver: zodResolver(toolFormSchema),
    defaultValues: {
      name: '',
      command: '',
      args: [],
      env: {},
      autoApprove: false,
    },
  });
  
  React.useEffect(() => {
    if (tool) {
      form.reset({
        name: tool.name,
        command: tool.command,
        args: tool.args || [],
        env: tool.env || {},
        autoApprove: tool.autoApprove || false,
      });
    }
  }, [tool, form]);
  
  const onSubmit = async (values: ToolFormValues) => {
    try {
      await updateTool.mutateAsync({
        workspaceId,
        toolId,
        data: values,
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to update tool:', error);
    }
  };
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="command"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Command</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Additional fields for args and env would go here */}
        
        <FormField
          control={form.control}
          name="autoApprove"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="!mt-0">Auto-approve tool execution</FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={updateTool.isLoading}
          >
            {updateTool.isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

### 6. File Management Components

Create components for file management:

```typescript
// web/src/components/files/FileTree.tsx
import { useState } from 'react';
import { Folder, File, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileNode } from '@/lib/stores/workspace/files';

interface FileTreeProps {
  files: FileNode[];
  onSelectFile: (path: string) => void;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
  selectedPath?: string;
}

export function FileTree({
  files,
  onSelectFile,
  expandedPaths,
  onToggleExpand,
  selectedPath,
}: FileTreeProps) {
  return (
    <div className="py-2">
      {files.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
          level={0}
          onSelectFile={onSelectFile}
          expandedPaths={expandedPaths}
          onToggleExpand={onToggleExpand}
          selectedPath={selectedPath}
        />
      ))}
    </div>
  );
}

interface FileTreeNodeProps {
  node: FileNode;
  level: number;
  onSelectFile: (path: string) => void;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
  selectedPath?: string;
}

function FileTreeNode({
  node,
  level,
  onSelectFile,
  expandedPaths,
  onToggleExpand,
  selectedPath,
}: FileTreeNodeProps) {
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(node.path);
  };
  
  const handleSelect = () => {
    if (node.type === 'file') {
      onSelectFile(node.path);
    } else {
      onToggleExpand(node.path);
    }
  };
  
  return (
    <div>
      <div
        className={cn(
          'flex items-center py-1 px-2 cursor-pointer hover:bg-muted rounded-md',
          isSelected && 'bg-muted'
        )}
        style={{ paddingLeft: `${(level * 12) + 8}px` }}
        onClick={handleSelect}
      >
        {node.type === 'directory' ? (
          <div className="flex items-center">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 mr-1" onClick={handleToggleExpand} />
            ) : (
              <ChevronRight className="h-4 w-4 mr-1" onClick={handleToggleExpand} />
            )}
            <Folder className="h-4 w-4 mr-2 text-blue-500" />
          </div>
        ) : (
          <div className="pl-5">
            <File className="h-4 w-4 mr-2 text-gray-500" />
          </div>
        )}
        <span className="text-sm truncate">{node.name}</span>
      </div>
      
      {node.type === 'directory' && isExpanded && node.children && (
        <div>
          {node.children.map((childNode) => (
            <FileTreeNode
              key={childNode.path}
              node={childNode}
              level={level + 1}
              onSelectFile={onSelectFile}
              expandedPaths={expandedPaths}
              onToggleExpand={onToggleExpand}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

### 7. Session Components

Create components for session management:

```typescript
// web/src/components/session/MessageList.tsx
import { useEffect, useRef } from 'react';
import { MessageItem } from './MessageItem';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Message } from '@/lib/stores/session/messages';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  error?: Error | null;
}

export function MessageList({ messages, isLoading, error }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Scroll to bottom on new messages
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }
  
  if (error) {
    return (
      <EmptyState
        icon="error"
        title="Error loading messages"
        description="Failed to load messages. Please try again."
      />
    );
  }
  
  if (messages.length === 0) {
    return (
      <EmptyState
        icon="message"
        title="No messages yet"
        description="Start a conversation to get help from Mandrake."
      />
    );
  }
  
  return (
    <div className="flex flex-col gap-4 p-4">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
```

## Shared Components

### Error Boundary

```typescript
// web/src/components/common/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Component error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Loading Spinner

```typescript
// web/src/components/common/LoadingSpinner.tsx
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };
  
  return (
    <Loader2 
      className={cn('animate-spin text-muted-foreground', sizeClasses[size], className)}
    />
  );
}
```

### Empty State

```typescript
// web/src/components/common/EmptyState.tsx
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center p-8',
      className
    )}>
      {icon && (
        <div className="mb-4 text-muted-foreground">
          {/* Icon component would be rendered here */}
        </div>
      )}
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
```

## Next Steps

1. Set up shadcn/ui components in the project
2. Create the base layout components
3. Implement the WidgetCard component
4. Create the basic common components (ErrorBoundary, LoadingSpinner, etc.)
5. Create core form components
6. Implement file management components
7. Implement session-related components
8. Build the modal components
9. Create the widget components

## Timeline

- Day 1: Set up shadcn/ui and create base layout components
- Day 2-3: Implement common components and WidgetCard
- Day 4-5: Create file management and form components
- Day 6-7: Implement session components
- Day 8-9: Build modal components
- Day 10-12: Create widget components
- Day 13-14: Test and refine all components
