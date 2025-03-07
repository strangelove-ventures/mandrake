import Image from "next/image";
import { api } from "../lib/api";

export default async function Home() {
  // Fetch data from API on server with error handling
  let status = "Unknown";
  let workspaces = [];
  let apiError = false;
  
  try {
    const response = await api.getStatus();
    status = response.status;
  } catch (error) {
    console.error("Failed to connect to API:", error);
    status = "Offline";
    apiError = true;
  }
  
  try {
    if (!apiError) {
      workspaces = await api.listWorkspaces();
    }
  } catch (error) {
    console.error("Failed to fetch workspaces:", error);
  }

  return (
    <div className="grid grid-rows-[auto_1fr_auto] min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Mandrake</h1>
        <div className={`text-sm ${status === "Offline" ? "text-red-500" : "text-gray-500"}`}>
          API Status: {status}
        </div>
        {status === "Offline" && (
          <div className="mt-2 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-sm">
            The API is currently offline. Make sure to run both the API and frontend with <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">bun run dev</code> from the project root.
          </div>
        )}
      </header>
      
      <main className="flex flex-col gap-8">
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Workspaces</h2>
          
          {apiError ? (
            <div className="text-yellow-600 dark:text-yellow-400">Unable to load workspaces - API is unavailable</div>
          ) : workspaces.length === 0 ? (
            <div className="text-gray-500">No workspaces found</div>
          ) : (
            <ul className="space-y-2">
              {workspaces.map((workspace) => (
                <li key={workspace.id} className="p-3 bg-gray-100 dark:bg-gray-700 rounded">
                  <h3 className="font-medium">{workspace.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{workspace.path}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
        
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
