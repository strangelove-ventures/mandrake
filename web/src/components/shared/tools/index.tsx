'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { PlusCircle } from 'lucide-react';
import { ToolsComponentProps } from './types';
import { useToolsConfig } from './hooks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import ServerTabs from './ServerTabs';
import ServerEditor from './ServerEditor';

/**
 * ToolsConfig component that can be used in both system and workspace contexts
 */
export default function ToolsConfig({ isWorkspace = false, workspaceId }: ToolsComponentProps) {
  const {
    toolsData,
    selectedConfigId,
    selectedServerId,
    isEditingServer,
    editingServer,
    isCreatingConfig,
    newConfigId,
    isCreatingServer,
    newServerId,
    newServerCommand,
    serverConfigJson,
    serverConfigError,
    isLoading,
    error,
    
    setIsEditingServer,
    setIsCreatingConfig,
    setNewConfigId,
    setIsCreatingServer,
    setNewServerId,
    setNewServerCommand,
    setServerConfigJson,
    
    handleSelectConfig,
    handleSelectServer,
    handleActivateConfig,
    handleEditServer,
    handleSaveServerEdits,
    handleAddConfig,
    handleAddServer,
    
    loadTools,
    loadActiveTools
  } = useToolsConfig(isWorkspace ? workspaceId : undefined);
  
  // If loading, show a loading state
  if (isLoading) {
    return <div className="text-center p-4">Loading tools configuration...</div>;
  }
  
  // If no data yet, show an error or loading state
  if (!toolsData) {
    return (
      <div className="text-center p-4">
        <h2 className="text-2xl font-bold mb-4">Tools Configuration</h2>
        <div className="p-8 border rounded-lg bg-gray-50 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No tools configuration found. This could be due to:
          </p>
          <ul className="list-disc pl-5 text-gray-500 dark:text-gray-400 text-left">
            <li>API connection issue - check the backend is running on port 4000</li>
            <li>Missing configuration file - default should be created automatically</li>
            <li>Permission issues accessing configuration directory</li>
          </ul>
          <Button 
            onClick={() => { loadTools(); loadActiveTools(); }}
            className="mt-4"
          >
            Retry Loading
          </Button>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
            Error: {error}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tools Configuration</h2>
        
        <div className="flex items-center space-x-2">
          {/* Move the dropdown here */}
          {Object.keys(toolsData.configs).length > 0 && (
            <Select 
              value={selectedConfigId || ''} 
              onValueChange={handleSelectConfig}
            >
              <SelectTrigger className="w-[180px]">
                <div className="flex items-center justify-between w-full">
                  <SelectValue placeholder="Select a configuration" />
                  {selectedConfigId === toolsData.active && (
                    <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                      Active
                    </Badge>
                  )}
                </div>
              </SelectTrigger>
              <SelectContent>
                {Object.keys(toolsData.configs).map(configId => (
                  <SelectItem key={configId} value={configId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {configId}
                      {configId === toolsData.active && (
                        <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                          Active
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
                {/* Add config button as last item */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setIsCreatingConfig(true);
                  }}
                  className="w-full flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Config
                </button>
              </SelectContent>
            </Select>
          )}
        </div>
        
        <Dialog open={isCreatingConfig} onOpenChange={setIsCreatingConfig}>
          <DialogTrigger className="hidden">  {/* Hide the original trigger */}
            <Button variant="outline">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Config
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Tool Configuration</DialogTitle>
              <DialogDescription>
                Create a new set of tool configurations with a unique ID.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="configId" className="text-right">Config ID</label>
                <Input
                  id="configId"
                  value={newConfigId}
                  onChange={(e) => setNewConfigId(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreatingConfig(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddConfig}>Create Config</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {Object.keys(toolsData.configs).length === 0 ? (
        <div className="text-center p-8 border rounded-lg bg-gray-50 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            No tool configurations found. Create a new configuration to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {/* Config selector dropdown has been moved up to the header */}
          
          {/* Selected config details */}
          <div className="w-full">
            {selectedConfigId ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Servers</CardTitle>
                    <CardDescription>
                      {selectedConfigId === toolsData.active 
                        ? "This is the active configuration" 
                        : "This configuration is not currently active"}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    {selectedConfigId !== toolsData.active && (
                      <Button 
                        variant="outline" 
                        onClick={() => handleActivateConfig(selectedConfigId)}
                        disabled={isLoading}
                      >
                        Set as Active
                      </Button>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  {selectedConfigId && toolsData.configs[selectedConfigId] && (
                    <ServerTabs
                      config={toolsData.configs[selectedConfigId]}
                      selectedServerId={selectedServerId}
                      onSelectServer={handleSelectServer}
                      onEditServer={(serverId) => handleEditServer(selectedConfigId, serverId)}
                      onAddServer={handleAddServer}
                      isCreatingServer={isCreatingServer}
                      setIsCreatingServer={setIsCreatingServer}
                      newServerId={newServerId}
                      setNewServerId={setNewServerId}
                      newServerCommand={newServerCommand}
                      setNewServerCommand={setNewServerCommand}
                      serverConfigJson={serverConfigJson}
                      setServerConfigJson={setServerConfigJson}
                    />
                  )}
                  
                  {serverConfigError && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertDescription>
                        Error in server configuration: {serverConfigError}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="text-center p-8 border rounded-lg bg-gray-50 dark:bg-gray-800">
                <p className="text-gray-500 dark:text-gray-400">
                  Select a configuration to view its details
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Server edit dialog */}
      <ServerEditor
        isOpen={isEditingServer}
        onClose={() => setIsEditingServer(false)}
        editingServer={editingServer}
        onSave={handleSaveServerEdits}
      />
      
      {/* Debug output */}
      <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 hidden">
        <h3 className="text-lg font-medium mb-2">Debug Information</h3>
        <div className="overflow-x-auto">
          <pre className="text-xs">
            <code>{JSON.stringify({
              context: isWorkspace ? `Workspace: ${workspaceId}` : 'System',
              activeToolsId: toolsData.active,
              configCount: Object.keys(toolsData.configs).length,
              configIds: Object.keys(toolsData.configs),
              selectedConfig: selectedConfigId,
              selectedServer: selectedServerId
            }, null, 2)}</code>
          </pre>
        </div>
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}
    </div>
  );
}

// Named exports for individual components
export { default as ConfigList } from './ConfigList';
export { default as ServerDetail } from './ServerDetail';
export { default as ServerEditor } from './ServerEditor';
export { default as ServerTabs } from './ServerTabs';
export { useToolsConfig } from './hooks';