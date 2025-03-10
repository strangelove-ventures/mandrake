# Zustand Stores Implementation Plan

## Overview

Zustand will be used for state management throughout the Mandrake frontend. We'll create stores that handle specific domains of application state, with a focus on separating UI state from data state (which will primarily be handled by React Query).

## Key Requirements

1. Clean, typed store definitions
2. Separation of concerns between different domains of state
3. Proper integration with React Query for data fetching
4. Persistence of critical UI state across page refreshes
5. Derived state with selectors for performance optimization
6. Support for asynchronous actions

## Store Structure

We'll organize our stores into the following categories:

```sh
web/src/lib/stores/
├── index.ts              # Main exports
├── ui/
│   ├── layout.ts         # Layout state (sidebar, etc.)
│   ├── theme.ts          # Theme preferences
│   ├── notifications.ts  # Toast notifications
│   └── modals.ts         # Modal management
├── workspace/
│   ├── current.ts        # Current workspace state
│   ├── files.ts          # File tree state
│   └── config.ts         # Workspace config state
├── session/
│   ├── active.ts         # Active session state
│   ├── messages.ts       # Session messages
│   └── status.ts         # Session status tracking
└── system/
    ├── global.ts         # Global system settings
    └── tools.ts          # System-wide tools config
```

## Implementation Approach

### 1. Store Creation Pattern

We'll use a consistent pattern for creating stores:

```typescript
// Example store pattern
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface ThemeState {
  mode: 'light' | 'dark' | 'system';
  accentColor: string;
  
  // Actions
  setMode: (mode: ThemeState['mode']) => void;
  setAccentColor: (color: string) => void;
  toggleMode: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    immer((set) => ({
      // Initial state
      mode: 'system',
      accentColor: '#7c3aed',
      
      // Actions
      setMode: (mode) => set((state) => {
        state.mode = mode;
      }),
      setAccentColor: (color) => set((state) => {
        state.accentColor = color;
      }),
      toggleMode: () => set((state) => {
        if (state.mode === 'light') state.mode = 'dark';
        else if (state.mode === 'dark') state.mode = 'light';
        else state.mode = 'light';
      }),
    })),
    {
      name: 'mandrake-theme',
    }
  )
);
```

### 2. UI Stores

#### Layout Store

```typescript
// web/src/lib/stores/ui/layout.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface LayoutState {
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  sidebarWidth: number;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarWidth: (width: number) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    immer((set) => ({
      isSidebarOpen: true,
      isSidebarCollapsed: false,
      sidebarWidth: 280,
      
      toggleSidebar: () => set((state) => {
        state.isSidebarOpen = !state.isSidebarOpen;
      }),
      setSidebarOpen: (isOpen) => set((state) => {
        state.isSidebarOpen = isOpen;
      }),
      toggleSidebarCollapsed: () => set((state) => {
        state.isSidebarCollapsed = !state.isSidebarCollapsed;
      }),
      setSidebarWidth: (width) => set((state) => {
        state.sidebarWidth = width;
      }),
    })),
    {
      name: 'mandrake-layout',
    }
  )
);
```

#### Notifications Store

```typescript
// web/src/lib/stores/ui/notifications.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  createdAt: Date;
}

export interface NotificationsState {
  notifications: Notification[];
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  immer((set) => ({
    notifications: [],
    
    addNotification: (notification) => {
      const id = uuidv4();
      set((state) => {
        state.notifications.push({
          ...notification,
          id,
          createdAt: new Date(),
        });
      });
      return id;
    },
    
    removeNotification: (id) => set((state) => {
      const index = state.notifications.findIndex((n) => n.id === id);
      if (index !== -1) {
        state.notifications.splice(index, 1);
      }
    }),
    
    clearNotifications: () => set((state) => {
      state.notifications = [];
    }),
  }))
);
```

#### Modal Store

```typescript
// web/src/lib/stores/ui/modals.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type ModalType = 
  | 'createWorkspace'
  | 'deleteWorkspace' 
  | 'addTool'
  | 'configureTool'
  | 'addProvider'
  | 'configureProvider'
  | 'editPrompt'
  | 'fileUpload'
  | 'filePreview';

export interface ModalState {
  activeModals: Map<ModalType, { isOpen: boolean; data?: any }>;
  
  // Actions
  openModal: (type: ModalType, data?: any) => void;
  closeModal: (type: ModalType) => void;
  getModalState: (type: ModalType) => { isOpen: boolean; data?: any };
}

export const useModalStore = create<ModalState>()(
  immer((set, get) => ({
    activeModals: new Map(),
    
    openModal: (type, data) => set((state) => {
      state.activeModals.set(type, { isOpen: true, data });
    }),
    
    closeModal: (type) => set((state) => {
      state.activeModals.set(type, { isOpen: false });
    }),
    
    getModalState: (type) => {
      const state = get().activeModals.get(type);
      return state || { isOpen: false };
    },
  }))
);
```

### 3. Workspace Stores

#### Current Workspace Store

```typescript
// web/src/lib/stores/workspace/current.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface CurrentWorkspaceState {
  currentWorkspaceId: string | null;
  
  // Actions
  setCurrentWorkspace: (id: string | null) => void;
}

export const useCurrentWorkspaceStore = create<CurrentWorkspaceState>()(
  immer((set) => ({
    currentWorkspaceId: null,
    
    setCurrentWorkspace: (id) => set((state) => {
      state.currentWorkspaceId = id;
    }),
  }))
);
```

#### Files Store

```typescript
// web/src/lib/stores/workspace/files.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileNode[];
  expanded?: boolean;
}

export interface FilesState {
  fileTree: FileNode[];
  expandedPaths: Set<string>;
  selectedFilePath: string | null;
  fileFilterPattern: string;
  
  // Actions
  setFileTree: (tree: FileNode[]) => void;
  toggleNodeExpanded: (path: string) => void;
  expandNode: (path: string) => void;
  collapseNode: (path: string) => void;
  setSelectedFile: (path: string | null) => void;
  setFileFilterPattern: (pattern: string) => void;
}

export const useFilesStore = create<FilesState>()(
  immer((set, get) => ({
    fileTree: [],
    expandedPaths: new Set(),
    selectedFilePath: null,
    fileFilterPattern: '',
    
    setFileTree: (tree) => set((state) => {
      state.fileTree = tree;
    }),
    
    toggleNodeExpanded: (path) => set((state) => {
      if (state.expandedPaths.has(path)) {
        state.expandedPaths.delete(path);
      } else {
        state.expandedPaths.add(path);
      }
    }),
    
    expandNode: (path) => set((state) => {
      state.expandedPaths.add(path);
    }),
    
    collapseNode: (path) => set((state) => {
      state.expandedPaths.delete(path);
    }),
    
    setSelectedFile: (path) => set((state) => {
      state.selectedFilePath = path;
    }),
    
    setFileFilterPattern: (pattern) => set((state) => {
      state.fileFilterPattern = pattern;
    }),
  }))
);
```

### 4. Session Stores

#### Active Session Store

```typescript
// web/src/lib/stores/session/active.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface ActiveSessionState {
  activeSessionId: string | null;
  isInputLocked: boolean;
  isGenerating: boolean;
  hasUnreadMessages: boolean;
  
  // Actions
  setActiveSession: (id: string | null) => void;
  setInputLocked: (isLocked: boolean) => void;
  setGenerating: (isGenerating: boolean) => void;
  setHasUnreadMessages: (hasUnread: boolean) => void;
}

export const useActiveSessionStore = create<ActiveSessionState>()(
  immer((set) => ({
    activeSessionId: null,
    isInputLocked: false,
    isGenerating: false,
    hasUnreadMessages: false,
    
    setActiveSession: (id) => set((state) => {
      state.activeSessionId = id;
      state.hasUnreadMessages = false;
    }),
    
    setInputLocked: (isLocked) => set((state) => {
      state.isInputLocked = isLocked;
    }),
    
    setGenerating: (isGenerating) => set((state) => {
      state.isGenerating = isGenerating;
    }),
    
    setHasUnreadMessages: (hasUnread) => set((state) => {
      state.hasUnreadMessages = hasUnread;
    }),
  }))
);
```

#### Messages Store

```typescript
// web/src/lib/stores/session/messages.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
  isStreaming?: boolean;
}

export interface MessagesState {
  messages: Map<string, Message[]>; // sessionId -> messages
  
  // Actions
  setSessionMessages: (sessionId: string, messages: Message[]) => void;
  addMessage: (sessionId: string, message: Omit<Message, 'createdAt'>) => void;
  updateStreamingMessage: (sessionId: string, messageId: string, content: string) => void;
  finishStreamingMessage: (sessionId: string, messageId: string) => void;
  clearSessionMessages: (sessionId: string) => void;
}

export const useMessagesStore = create<MessagesState>()(
  immer((set) => ({
    messages: new Map(),
    
    setSessionMessages: (sessionId, messages) => set((state) => {
      state.messages.set(sessionId, messages);
    }),
    
    addMessage: (sessionId, message) => set((state) => {
      const sessionMessages = state.messages.get(sessionId) || [];
      sessionMessages.push({
        ...message,
        createdAt: new Date(),
      });
      state.messages.set(sessionId, sessionMessages);
    }),
    
    updateStreamingMessage: (sessionId, messageId, content) => set((state) => {
      const sessionMessages = state.messages.get(sessionId);
      if (!sessionMessages) return;
      
      const message = sessionMessages.find((m) => m.id === messageId);
      if (message) {
        message.content = content;
        message.isStreaming = true;
      }
    }),
    
    finishStreamingMessage: (sessionId, messageId) => set((state) => {
      const sessionMessages = state.messages.get(sessionId);
      if (!sessionMessages) return;
      
      const message = sessionMessages.find((m) => m.id === messageId);
      if (message) {
        message.isStreaming = false;
      }
    }),
    
    clearSessionMessages: (sessionId) => set((state) => {
      state.messages.delete(sessionId);
    }),
  }))
);
```

### 5. System Stores

#### Global System Store

```typescript
// web/src/lib/stores/system/global.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface SystemSettings {
  defaultWorkspaceDirectory: string;
  maxConcurrentSessions: number;
  telemetryEnabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface GlobalSystemState {
  settings: SystemSettings;
  
  // Actions
  updateSettings: (settings: Partial<SystemSettings>) => void;
}

export const useGlobalSystemStore = create<GlobalSystemState>()(
  persist(
    immer((set) => ({
      settings: {
        defaultWorkspaceDirectory: '~/.mandrake/workspaces',
        maxConcurrentSessions: 5,
        telemetryEnabled: true,
        logLevel: 'info',
      },
      
      updateSettings: (settings) => set((state) => {
        state.settings = {
          ...state.settings,
          ...settings,
        };
      }),
    })),
    {
      name: 'mandrake-system-settings',
    }
  )
);
```

### 6. Store Hooks and Selectors

Create custom hooks for common store operations:

```typescript
// web/src/lib/stores/hooks.ts
import { useCurrentWorkspaceStore } from './workspace/current';
import { useMessagesStore } from './session/messages';
import { useActiveSessionStore } from './session/active';

// Example hook that combines multiple stores
export function useActiveSessionMessages() {
  const activeSessionId = useActiveSessionStore((state) => state.activeSessionId);
  const sessionMessages = useMessagesStore((state) => 
    activeSessionId ? state.messages.get(activeSessionId) || [] : []
  );
  
  return sessionMessages;
}

// Example hook for a common operation
export function useAddUserMessage() {
  const activeSessionId = useActiveSessionStore((state) => state.activeSessionId);
  const addMessage = useMessagesStore((state) => state.addMessage);
  
  return (content: string) => {
    if (!activeSessionId) return;
    
    addMessage(activeSessionId, {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
    });
  };
}
```

### 7. Integration with React Query

Create utilities for integrating React Query with our Zustand stores:

```typescript
// web/src/lib/stores/utils/query-integration.ts
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentWorkspaceStore } from '../workspace/current';
import { useActiveSessionStore } from '../session/active';

// Example hook that integrates React Query with our stores
export function useInvalidateWorkspaceQueries() {
  const queryClient = useQueryClient();
  const currentWorkspaceId = useCurrentWorkspaceStore((state) => state.currentWorkspaceId);
  
  return () => {
    if (currentWorkspaceId) {
      queryClient.invalidateQueries(['workspaces', currentWorkspaceId]);
    }
  };
}
```

## Main Export

Create a clean export interface:

```typescript
// web/src/lib/stores/index.ts
// Export UI stores
export * from './ui/layout';
export * from './ui/theme';
export * from './ui/notifications';
export * from './ui/modals';

// Export workspace stores
export * from './workspace/current';
export * from './workspace/files';
export * from './workspace/config';

// Export session stores
export * from './session/active';
export * from './session/messages';
export * from './session/status';

// Export system stores
export * from './system/global';
export * from './system/tools';

// Export hooks and utilities
export * from './hooks';
export * from './utils/query-integration';
```

## Next Steps

1. Create the base store file structure
2. Implement core UI stores (layout, theme)
3. Implement workspace-related stores
4. Implement session-related stores
5. Implement system-related stores
6. Create integration hooks for combining store data
7. Test with example components

## Timeline

- Day 1: Setup store file structure and implement UI stores
- Day 2: Implement workspace and system stores
- Day 3: Implement session stores
- Day 4: Create integration hooks and utilities
- Day 5: Test and refine
