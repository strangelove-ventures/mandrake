'use client';

interface FilesConfigProps {
  workspaceId: string;
}

export default function FilesConfig({ workspaceId }: FilesConfigProps) {
  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Files Management</h3>
      
      <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-12 w-12 mx-auto mb-4 text-gray-400"
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          strokeWidth={1.5}
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" 
          />
        </svg>
        <h4 className="text-lg font-medium mb-2">File Management</h4>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          This feature is coming soon. You'll be able to manage files and include them in your AI sessions.
        </p>
      </div>
    </div>
  );
}
