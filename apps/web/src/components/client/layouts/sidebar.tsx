'use client';

import { useUIStore } from '@/store';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  FolderOpen, 
  MessageSquare, 
  Wrench, 
  Box, 
  FileText, 
  LayoutDashboard,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

function NavItem({ href, icon, label, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
        active 
          ? "bg-accent text-accent-foreground" 
          : "hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  
  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };
  
  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r bg-background transition-transform duration-300 md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <h2 className="text-lg font-semibold">Navigation</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        </div>
        
        <ScrollArea className="h-[calc(100vh-64px)]">
          <div className="px-3 py-4">
            <div className="mb-4">
              <h3 className="px-3 text-xs font-medium text-muted-foreground">Main</h3>
              <nav className="mt-2 space-y-1">
                <NavItem 
                  href="/" 
                  icon={<Home className="h-5 w-5" />} 
                  label="Dashboard" 
                  active={isActive('/')}
                />
                <NavItem 
                  href="/workspaces" 
                  icon={<FolderOpen className="h-5 w-5" />} 
                  label="Workspaces" 
                  active={isActive('/workspaces')}
                />
                <NavItem 
                  href="/sessions" 
                  icon={<MessageSquare className="h-5 w-5" />} 
                  label="Sessions" 
                  active={isActive('/sessions')}
                />
              </nav>
            </div>

            <div className="mb-4">
              <h3 className="px-3 text-xs font-medium text-muted-foreground">Configuration</h3>
              <nav className="mt-2 space-y-1">
                <NavItem 
                  href="/tools" 
                  icon={<Wrench className="h-5 w-5" />} 
                  label="Tools" 
                  active={isActive('/tools')}
                />
                <NavItem 
                  href="/models" 
                  icon={<Box className="h-5 w-5" />} 
                  label="Models" 
                  active={isActive('/models')}
                />
                <NavItem 
                  href="/prompt" 
                  icon={<FileText className="h-5 w-5" />} 
                  label="Prompt" 
                  active={isActive('/prompt')}
                />
                <NavItem 
                  href="/dynamic" 
                  icon={<LayoutDashboard className="h-5 w-5" />} 
                  label="Dynamic Context" 
                  active={isActive('/dynamic')}
                />
              </nav>
            </div>
          </div>
        </ScrollArea>
      </aside>
    </>
  );
}
