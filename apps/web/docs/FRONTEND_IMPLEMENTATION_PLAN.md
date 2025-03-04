# Mandrake Frontend Implementation Plan

## Overview

This plan outlines the implementation of the Mandrake frontend web interface, which will provide users with a clean, intuitive way to interact with the AI agent platform. The frontend will leverage the existing API implementation and service registry.

## Goals

- Create a responsive and accessible web interface
- Implement UI components that work for both system-level and workspace-level resources
- Build a streaming chat interface with Zustand state management
- Leverage the existing API implementation
- Support all required management interfaces (tools, models, prompts, etc.)

## Technologies

- **Framework**: Next.js with App Router
- **UI Components**: Tailwind CSS with Shadcn UI
- **State Management**: Zustand
- **Streaming**: Server-sent events for real-time updates
- **Testing**: Minimal testing, relying on backend tests

## Shadcn UI Components Needed

Installation commands:
```bash
# Core components
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add textarea
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add select
npx shadcn@latest add form
npx shadcn@latest add tabs
npx shadcn@latest add toast
npx shadcn@latest add toggle
npx shadcn@latest add tooltip
npx shadcn@latest add sheet
npx shadcn@latest add separator

# Tables and lists
npx shadcn@latest add table
npx shadcn@latest add command

# Navigation
npx shadcn@latest add navigation-menu
npx shadcn@latest add sidebar

# Data display
npx shadcn@latest add badge
npx shadcn@latest add skeleton
npx shadcn@latest add progress
npx shadcn@latest add accordion
```

## Architecture

```
apps/web/src/
├── app/                 # Next.js App Router pages matching API structure
├── components/          # React components
│   ├── ui/              # Shadcn UI components
│   ├── layouts/         # Layout components
│   ├── shared/          # Components shared across resource types
│   ├── workspaces/      # Workspace-specific components
│   ├── sessions/        # Session and chat components
│   ├── tools/           # Tool configuration components
│   ├── models/          # Model configuration components
│   ├── dynamic/         # Dynamic context components
│   ├── prompt/          # Prompt editing components
│   └── files/           # File management components
├── hooks/               # Custom React hooks
├── stores/              # Zustand stores
└── styles/              # Global styles
```

## Zustand Store Structure

We'll implement several Zustand stores to manage state:

```typescript
// Core stores
const useUIStore = create<UIStore>((set) => ({
  theme: 'light',
  sidebarOpen: true,
  setTheme: (theme) => set({ theme }),
  // ...
}));

const useWorkspacesStore = create<WorkspacesStore>((set) => ({
  workspaces: [],
  currentWorkspace: null,
  isLoading: false,
  fetchWorkspaces: async () => { /* implementation */ },
  // ...
}));

// Resource stores (similar pattern for models, tools, etc.)
const useSessionsStore = create<SessionsStore>((set) => ({
  sessions: [],
  currentSession: null,
  messages: [],
  isLoading: false,
  streamingMessage: null,
  fetchSessions: async (workspaceId) => { /* implementation */ },
  sendMessage: async (content) => { /* implementation */ },
  // Stream handling
  startStream: () => set({ streamingMessage: { content: '', toolCalls: [] } }),
  appendToStream: (chunk) => set((state) => {
    // Update streaming message with new chunk
  }),
  // ...
}));
```

## UI Components

### Layout Components

- **AppShell**: Main layout with navigation and theme switching
- **Sidebar**: Navigation with workspace/system toggle
- **Header**: App header with actions
- **ResourceTabs**: Reusable tabbed interface for resource types

### Shared Resource Components

- **ResourceList**: Generic list component for resources
- **ResourceCreator**: Form for creating new resources
- **ResourceEditor**: Edit existing resources
- **ResourceDetails**: View resource details

### Workspace Components

- **WorkspaceList**: List of available workspaces
- **WorkspaceCreator**: Create new workspace form
- **WorkspaceSettings**: Configure workspace settings
- **WorkspaceSwitcher**: Switch between workspaces

### Session Components

- **SessionList**: List of available sessions
- **ChatInterface**: Main chat UI with message history
- **MessageItem**: Individual message display
- **ChatInput**: Message input with commands
- **ToolCallVisualization**: Show tool calls in the UI
- **StreamingMessage**: Display streaming message

### Configuration Components

- **ToolsManager**: Manage tool servers and sets
- **ToolServerStatus**: View server status and logs
- **ToolMethodExecutor**: Execute tool methods
- **ModelsList**: Manage available models
- **ActiveModelSelector**: Select active model
- **PromptEditor**: Edit system prompts
- **DynamicContextManager**: Manage dynamic contexts

### File Management Components

- **FileExplorer**: Browse and manage files
- **FileEditor**: Edit workspace files
- **FileUploader**: Upload files to workspace

## Pages / Routes

Structure following the API routes pattern:

```sh
/                                             # Dashboard
/workspaces                                   # Workspace list
/workspaces/new                               # Create workspace
/workspaces/[id]                              # Workspace overview
/workspaces/[id]/files                        # File explorer
/workspaces/[id]/files/[fileName]             # File editor
/workspaces/[id]/sessions                     # Session list
/workspaces/[id]/sessions/[sessionId]         # Chat interface
/workspaces/[id]/tools                        # Tools list
/workspaces/[id]/tools/[serverName]/status    # Tool server status
/workspaces/[id]/models                       # Models list
/workspaces/[id]/dynamic                      # Dynamic contexts
/workspaces/[id]/prompt                       # Prompt editor
/sessions                                     # System sessions
/sessions/[id]                                # System session chat
/tools                                        # System tools
/tools/[serverName]/status                    # System tool status
/models                                       # System models
/dynamic                                      # System dynamic contexts
/prompt                                       # System prompt editor
```

## Features and Implementation Details

### Shared Component Patterns

To support both system-level and workspace-level resources:

```tsx
// Example of a component that works for both contexts
function ModelsList({ workspaceId }: { workspaceId?: string }) {
  // Fetch from appropriate endpoint based on workspaceId
  const endpoint = workspaceId 
    ? `/api/workspaces/${workspaceId}/models` 
    : '/api/models';
    
  // Component implementation that works in both contexts
}
```

### Streaming Implementation

The streaming approach will:

1. Use server-sent events for the stream
2. Update Zustand store with incoming chunks
3. UI components subscribe to the store

```typescript
// In Zustand store
const sendMessageWithStreaming = async (content, sessionId, workspaceId) => {
  set({ isStreaming: true, streamingMessage: { content: '', toolCalls: [] } });
  
  const endpoint = workspaceId
    ? `/api/workspaces/${workspaceId}/sessions/${sessionId}/stream`
    : `/api/sessions/${sessionId}/stream`;
    
  const response = await fetch(endpoint, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  
  const reader = response.body?.getReader();
  if (!reader) return;
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = new TextDecoder().decode(value);
    // Parse the chunk and update store
    set(state => ({
      streamingMessage: {
        content: state.streamingMessage.content + chunk,
        // Handle tool calls appropriately
      }
    }));
  }
  
  set({ isStreaming: false });
  // Finalize the message in regular messages list
};
```

### Theme Switching

Implement light/dark mode using Tailwind and a Zustand store:

```typescript
const useThemeStore = create<ThemeStore>((set) => ({
  theme: 'light',
  setTheme: (theme) => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    set({ theme });
  },
}));
```

## Implementation Phases

### Phase 1: Foundation

- Set up Next.js app structure
- Implement Shadcn UI components
- Create Zustand stores
- Build core layout components
- Implement theme switching

### Phase 2: Workspace Management

- Implement workspace listing and creation
- Build workspace settings components
- Create file explorer and editor components
- Implement workspace switching

### Phase 3: Session & Chat Interface

- Create session list components
- Build chat interface with streaming support
- Implement tool call visualization
- Develop message input and commands

### Phase 4: Configuration Management

- Build tools management interface
- Implement model configuration components
- Create prompt editing interface
- Develop dynamic context management
- Build server status monitoring

### Phase 5: Polish and Integration

- Connect all components to their respective API endpoints
- Implement proper loading states and error handling
- Add animations and transitions
- Test all functionality end-to-end
- Add responsive design for mobile

## Development Guidelines

- Leverage the existing API structure
- Create reusable components that work for both system and workspace contexts
- Use TypeScript for all components
- Implement responsive design
- Ensure proper loading and error states
- Use consistent naming conventions across components

## Next Steps

1. Set up the Next.js app with Shadcn UI
2. Configure Zustand stores
3. Implement core layout components
4. Build the workspace management interface
5. Create the chat interface with streaming support
