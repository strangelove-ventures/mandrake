'use client';

import Header from '@/components/ui/Header';
import WorkspaceList from '@/components/workspace/WorkspaceList';

export default function WorkspacesPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-2">Workspaces</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Manage your Mandrake workspaces
        </p>
        
        <WorkspaceList />
      </main>
    </div>
  );
}
