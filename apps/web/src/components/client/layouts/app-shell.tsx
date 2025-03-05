'use client';

import { useEffect } from 'react';
import { useUIStore, initializeTheme } from '@/store';
import { Header } from './header';
import { Sidebar } from './sidebar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { sidebarOpen } = useUIStore();
  
  // Initialize theme when component mounts
  useEffect(() => {
    initializeTheme();
  }, []);
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex h-[calc(100vh-64px)]">
        <Sidebar />
        <main 
          className={`flex-1 p-6 transition-all duration-300 ${
            sidebarOpen ? 'md:ml-64' : 'md:ml-0'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
