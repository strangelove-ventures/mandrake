# Mandrake Frontend Implementation Plan

## Overview

This plan outlines the implementation approach for the Mandrake frontend, integrating all components into a cohesive user experience. We'll build the frontend in stages, focusing on getting a basic working version first, then enhancing the functionality and user experience.

## Key Components

1. **Backend Type Refactoring**: Move shared types to the utils package
2. **API Client**: Implement API client with React Query integration
3. **Zustand Stores**: Create state management with Zustand
4. **UI Components**: Develop reusable components using shadcn/ui
5. **Pages**: Implement page structure with Next.js App Router

## Implementation Phases

### Phase 1: Foundation (Week 1)

#### Goals
- Set up project structure
- Implement basic API client
- Create core UI components
- Set up basic routing
- Establish state management pattern

#### Tasks
1. **Project Setup**
   - Initialize shadcn/ui components
   - Configure Tailwind CSS
   - Set up ESLint and Prettier
   - Configure path aliases

2. **Core UI Components**
   - Create AppLayout and WorkspaceLayout
   - Implement basic navigation
   - Set up error boundaries and loading states
   - Create reusable card components

3. **Basic API Client**
   - Implement fetcher utilities
   - Create workspace and session API modules
   - Set up React Query provider
   - Implement basic data fetching hooks

4. **State Management**
   - Set up Zustand stores for UI state
   - Create workspace and session stores
   - Implement basic state persistence

5. **Page Structure**
   - Create home page with workspace list
   - Implement basic workspace page
   - Add placeholder session page
   - Set up 404 and error pages

### Phase 2: Core Functionality (Week 2)

#### Goals
- Implement workspace management
- Create session interface
- Implement file explorer
- Add tool configuration

#### Tasks
1. **Workspace Management**
   - Create workspace creation flow
   - Implement workspace settings page
   - Add workspace deletion
   - Create workspace navigation

2. **Session Interface**
   - Implement chat interface
   - Create message list component
   - Add user input component
   - Set up streaming message support

3. **File Explorer**
   - Create file tree component
   - Implement file preview
   - Add file upload/download
   - Create file context actions

4. **Tool Configuration**
   - Implement tool list view
   - Create tool configuration forms
   - Add tool execution interface
   - Implement tool output handling

### Phase 3: Advanced Features (Week 3)

#### Goals
- Implement model configuration
- Add dynamic context support
- Create prompt customization
- Implement MCP server management

#### Tasks
1. **Model Configuration**
   - Create model selection interface
   - Implement provider configuration
   - Add model testing
   - Create model usage metrics

2. **Dynamic Context**
   - Implement context rules interface
   - Create context preview
   - Add context refresh actions
   - Implement context integration with sessions

3. **Prompt Customization**
   - Create prompt editor
   - Implement section management
   - Add variable interpolation
   - Create prompt preview

4. **MCP Server Management**
   - Implement server list view
   - Create server control interface
   - Add server logs viewer
   - Implement server configuration

### Phase 4: Refinement (Week 4)

#### Goals
- Enhance user experience
- Improve performance
- Add responsive design
- Implement testing

#### Tasks
1. **UX Enhancements**
   - Add animations and transitions
   - Improve loading states
   - Create toast notifications
   - Refine error handling

2. **Performance Optimization**
   - Implement code splitting
   - Add virtualized lists
   - Optimize data fetching
   - Reduce bundle size

3. **Responsive Design**
   - Refine mobile layouts
   - Add responsive navigation
   - Create adaptive widgets
   - Implement touch interactions

4. **Testing**
   - Add unit tests
   - Implement integration tests
   - Create test mocks
   - Set up CI testing

## Integration Points

### API Client + Stores
- API client provides data fetching
- Stores manage UI state and data caching
- React Query serves as the bridge between them

### Stores + Components
- Stores provide data to components
- Components update state through store actions
- React Query invalidation triggers UI updates

### Components + Pages
- Pages compose components
- Components handle specific functionality
- Layouts provide structure and context

## Key Technical Decisions

### Type System
- Wait for backend type refactoring to be complete before finalizing frontend types
- Use interim types that mirror the expected structure
- Plan for migration when utils package types are available

### State Management
- Use React Query for server state
- Use Zustand for UI state
- Use localStorage for persistence
- Separate domain state into modular stores

### Component Architecture
- Use shadcn/ui as the component foundation
- Create widget abstractions for domain-specific functionality
- Use composition over inheritance
- Keep components focused on single responsibilities

### Routing Strategy
- Use Next.js App Router
- Create clean URL hierarchy
- Implement dynamic parameters for resources
- Use layout routes for shared UI

## Development Workflow

1. Start with the backend type refactoring
2. Implement the API client with interim types
3. Create basic UI components and layouts
4. Build the core pages with minimal functionality
5. Implement the essential stores for state management
6. Gradually add more advanced features
7. Refine and test the entire application

## Required Dependencies

```json
"dependencies": {
  "@radix-ui/react-dialog": "^1.0.5",
  "@radix-ui/react-dropdown-menu": "^2.0.6",
  "@radix-ui/react-icons": "^1.3.0",
  "@radix-ui/react-slot": "^1.0.2",
  "@radix-ui/react-tabs": "^1.0.4",
  "@tanstack/react-query": "^5.17.19",
  "@tanstack/react-query-devtools": "^5.17.21",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.1.0",
  "lucide-react": "^0.312.0",
  "next": "14.0.4",
  "next-themes": "^0.2.1",
  "react": "^18",
  "react-dom": "^18",
  "react-hook-form": "^7.49.3",
  "react-markdown": "^9.0.1",
  "tailwind-merge": "^2.2.0",
  "tailwindcss-animate": "^1.0.7",
  "uuid": "^9.0.1",
  "zod": "^3.22.4",
  "zustand": "^4.5.0"
}
```

## File Structure

```
web/
├── public/                     # Static assets
├── src/
│   ├── app/                    # Next.js App Router pages
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── layouts/            # Page layouts
│   │   ├── widgets/            # Domain-specific widgets
│   │   ├── common/             # Shared components
│   │   └── ...                 # Other component categories
│   ├── lib/                    # Utility libraries
│   │   ├── api-client/         # API client
│   │   ├── stores/             # Zustand stores
│   │   └── utils/              # Helper functions
│   └── styles/                 # Global styles
├── docs/                       # Documentation
│   ├── API_CLIENT_IMPLEMENTATION_PLAN.md
│   ├── STORES_IMPLEMENTATION_PLAN.md
│   ├── UI_COMPONENTS_IMPLEMENTATION_PLAN.md
│   ├── PAGES_IMPLEMENTATION_PLAN.md
│   ├── TYPE_REFACTORING_PLAN.md
│   └── INTERIM_API_CLIENT_PLAN.md
└── ...                         # Config files
```

## Next Steps

1. Begin implementing the backend type refactoring
2. Start frontend development with the API client
3. Set up the basic UI components and page structure
4. Implement the essential state management
5. Focus on the core workspace and session functionality
6. Gradually add the more advanced features

## Milestones

- **Week 1**: Basic project structure and foundation
- **Week 2**: Core workspace and session functionality
- **Week 3**: Advanced features (models, dynamic context, prompt)
- **Week 4**: Polish, testing, and performance optimization
