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
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="serverId" className="text-right">Server ID</label>
                <Input
                  id="serverId"
                  value={newServerId}
                  onChange={(e) => setNewServerId(e.target.value.replace(/\s+/g, ''))}
                  className="col-span-3"
                  placeholder="e.g., ripper, fetch, search (no spaces)"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <label htmlFor="serverConfig" className="text-right pt-2">Configuration</label>
                <Textarea
                  id="serverConfig"
                  value={serverConfigJson}
                  onChange={(e) => setServerConfigJson(e.target.value)}
                  className="col-span-3 font-mono h-32"
                  placeholder={`{
  "command": "ripper-server",
  "args": ["--transport=stdio", "--excludePatterns=\\\\.ws"]
}`}
                />
              </div>
              <div className="col-span-4 pl-4">
                <p className="text-sm text-gray-500">
                  The configuration should be a valid JSON object with at least a "command" property
                  and optionally "args" (array of strings), "env" (object), and "autoApprove" (array of strings).
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreatingServer(false)}>
                Cancel
              </Button>
              <Button onClick={onAddServer}>Add Server</Button>
            </DialogFooter>
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditServer(serverId);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>
                </Button>
              </li>
            ))}
          </ul>
          
          {selectedServerId && (
            <div className="p-4 border rounded-md">
              <ServerDetail 
                serverId={selectedServerId} 
                config={config[selectedServerId]} 
                onEdit={() => onEditServer(selectedServerId)} 
              />
            </div>
          )}
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
