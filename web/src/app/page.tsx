/**
 * Home page component
 */
import WorkspaceList from "@/components/WorkspaceList";
import ApiStatus from "@/components/ApiStatus";
import SessionDemo from "@/components/SessionDemo";

export default function Home() {
  return (
    <div className="grid grid-rows-[auto_1fr_auto] min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Mandrake</h1>
        <p className="text-gray-500">AI Assistant with advanced context management</p>
        <ApiStatus />
      </header>
      
      <main className="flex flex-col gap-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <WorkspaceList />
          </section>
          
          <section>
            <SessionDemo />
          </section>
        </div>
        
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a 
              href="/sessions" 
              className="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
            >
              <h3 className="font-medium">Sessions</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Manage your chat sessions</p>
            </a>
            <a 
              href="/config" 
              className="bg-purple-100 dark:bg-purple-900 p-4 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
            >
              <h3 className="font-medium">Configuration</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Update system settings</p>
            </a>
            <a 
              href="/models" 
              className="bg-green-100 dark:bg-green-900 p-4 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
            >
              <h3 className="font-medium">Models</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Configure AI models</p>
            </a>
            <a 
              href="/tools" 
              className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors"
            >
              <h3 className="font-medium">Tools</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Manage AI tools</p>
            </a>
          </div>
        </section>
      </main>
      
      <footer className="mt-8 text-center text-sm text-gray-500">
        <p>Mandrake AI Assistant · {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}