/**
 * Home page component
 */
import Header from '@/components/ui/Header';
import WorkspaceList from '@/components/workspace/WorkspaceList';
import SystemSessionList from '@/components/session/SystemSessionList';
import SystemConfigPanel from '@/components/system/config/SystemConfigPanel';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to Mandrake</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          AI Assistant with advanced context management
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Content (2/3) */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <WorkspaceList />
            <SystemSessionList />
          </div>
          
          {/* Right Content (1/3) */}
          <div className="lg:col-span-1">
            <SystemConfigPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
