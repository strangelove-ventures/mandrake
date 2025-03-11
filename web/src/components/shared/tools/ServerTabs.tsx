'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ToolConfig } from './types';
import ServerDetail from './ServerDetail';

interface ServerTabsProps {
  config: ToolConfig;
  selectedServerId: string | null;
  onSelectServer: (serverId: string) => void;
  onEditServer: (serverId: string) => void;
  onToggleServerDisabled: (serverId: string) => void;
  onAddServer: () => Promise<void>;
  isCreatingServer: boolean;
  setIsCreatingServer: (isCreating: boolean) => void;
  newServerId: string;
  setNewServerId: (serverId: string) => void;
  newServerCommand: string;
  setNewServerCommand: (command: string) => void;
  serverConfigJson: string;
  setServerConfigJson: (json: string) => void;
}

/**
 * Displays tabs for server selection and server details
 */
export default function ServerTabs({
  config,
  selectedServerId,
  onSelectServer,
  onEditServer,
  onToggleServerDisabled,
  onAddServer,
  isCreatingServer,
  setIsCreatingServer,
  newServerId,
  setNewServerId,
  newServerCommand,
  setNewServerCommand,
  serverConfigJson,
  setServerConfigJson
}: ServerTabsProps) {
  const serverIds = Object.keys(config);
  const selectedServer = selectedServerId && config[selectedServerId];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        
        <Dialog open={isCreatingServer} onOpenChange={setIsCreatingServer}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Server
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Server</DialogTitle>
              <DialogDescription>
                Add a new server configuration.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="serverId" className="text-sm font-medium">Server ID</label>
                <Input
                  id="serverId"
                  value={newServerId}
                  onChange={(e) => setNewServerId(e.target.value.replace(/\s+/g, ''))}
                  className="w-full"
                  placeholder="e.g., ripper, fetch, search (no spaces)"
                />
              </div>
              
              <div className="flex flex-col gap-2 mt-4">
                <label htmlFor="serverConfig" className="text-sm font-medium">Configuration</label>
                <textarea
                  id="serverConfig"
                  value={serverConfigJson}
                  onChange={(e) => setServerConfigJson(e.target.value)}
                  className="w-full p-3 border rounded-md h-64 font-mono text-sm"
                  placeholder='{"command": "ripper-server", "args": ["--transport=stdio", "--excludePatterns=\\.ws"]}'
                />
              </div>
              
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  The configuration should be a valid JSON object with at least a "command" property
                  and optionally "args" (array of strings), "env" (object), and "autoApprove" (array of strings).
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <div 
                className="px-4 py-2 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                onClick={() => setIsCreatingServer(false)}
              >
                Cancel
              </div>
              <div
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 cursor-pointer"
                onClick={onAddServer}
              >
                Add Server
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {serverIds.length > 0 ? (
        <div className="space-y-4">
          <ul className="space-y-2">
            {serverIds.map(serverId => (
              <li 
                key={serverId} 
                className={`p-3 border rounded-md flex justify-between items-center ${selectedServerId === serverId ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'} ${config[serverId].disabled ? 'opacity-60' : ''}`}
                onClick={() => !config[serverId].disabled && onSelectServer(serverId)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`h-3 w-3 rounded-full ${config[serverId].disabled ? 'bg-gray-400' : 'bg-green-500'}`} title={config[serverId].disabled ? 'Disabled' : 'Running'} />
                  <span className="font-medium">{serverId}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Edit button */}
                  <div 
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer" 
                    title="Edit server"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditServer(serverId);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>
                  </div>
                  
                  {/* Inspect button */}
                  <div 
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                    title="Inspect server (coming soon)"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Will implement inspection modal later
                      alert('Server inspection coming soon');
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                  </div>
                  
                  {/* Enable/disable toggle */}
                  <div 
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                    title={config[serverId].disabled ? "Enable server" : "Disable server"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleServerDisabled(serverId);
                    }}
                  >
                    {config[serverId].disabled ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-red-500"><path d="M18.36 6.64A9 9 0 0 1 20.77 15"></path><path d="M6.16 6.16a9 9 0 1 0 12.68 12.68"></path><path d="M12 2v4"></path><path d="m2 2 20 20"></path></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-green-500"><path d="M12 2v4"></path><path d="M12 18v4"></path><path d="M4.93 4.93l2.83 2.83"></path><path d="M16.24 16.24l2.83 2.83"></path><path d="M2 12h4"></path><path d="M18 12h4"></path><path d="M4.93 19.07l2.83-2.83"></path><path d="M16.24 7.76l2.83-2.83"></path></svg>
                    )}
                  </div>
                  
                  {/* Delete button */}
                  <div 
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-500 rounded cursor-pointer"
                    title="Delete server"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Are you sure you want to delete the ${serverId} server?`)) {
                        // Would call actual delete function here
                        alert('Delete server functionality coming soon');
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          
          {/* Server details shown only when editing in modal */}
        </div>
      ) : (
        <div className="text-center p-6 border rounded-lg bg-gray-50 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            No servers found in this configuration. Add a new server to get started.
          </p>
        </div>
      )}
    </div>
  );
}
