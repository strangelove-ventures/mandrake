# Phase 3: UI Component Updates

This document outlines the plan for Phase 3 of the MCP Inspector integration, focusing on UI component updates.

## Current State

Our current UI components provide basic functionality:

1. Server management (start, stop, configure)
2. Tool discovery and execution
3. Basic server status display
4. Simple error handling

## Target State

Enhance UI components with:

1. Better server status visualization
2. Improved tool execution UI with completions
3. Real-time log viewing
4. Enhanced error handling and feedback
5. Better server management UI

## Implementation Plan

### 1. Enhanced Server Status Components

#### Server Status Indicator Component

```tsx
// web/src/components/shared/tools/ServerStatusIndicator.tsx
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface ServerStatusIndicatorProps {
  status: string;
  error?: string;
  lastRetry?: number;
  retryCount?: number;
}

export function ServerStatusIndicator({
  status,
  error,
  lastRetry,
  retryCount
}: ServerStatusIndicatorProps) {
  // Map status to color and text
  let badgeVariant: 'default' | 'success' | 'warning' | 'destructive' | 'outline' = 'default';
  let badgeText = status || 'Unknown';
  let tooltipText = '';
  
  switch (status?.toLowerCase()) {
    case 'connected':
      badgeVariant = 'success';
      badgeText = 'Connected';
      break;
    case 'disconnected':
      badgeVariant = 'destructive';
      badgeText = 'Disconnected';
      break;
    case 'error':
      badgeVariant = 'destructive';
      badgeText = 'Error';
      tooltipText = error || 'Unknown error';
      break;
    case 'starting':
      badgeVariant = 'warning';
      badgeText = 'Starting';
      break;
    case 'stopped':
      badgeVariant = 'outline';
      badgeText = 'Stopped';
      break;
    default:
      badgeVariant = 'default';
      badgeText = status || 'Unknown';
  }
  
  // Add retry information to tooltip if applicable
  if (retryCount && retryCount > 0) {
    tooltipText += tooltipText ? ' | ' : '';
    tooltipText += `Retry ${retryCount}/3`;

    if (lastRetry) {
      const lastRetryTime = new Date(lastRetry).toLocaleTimeString();
      tooltipText += ` at ${lastRetryTime}`;
    }
  }
  
  return (
    <div className=\"inline-flex items-center\">
      <Badge variant={badgeVariant} className=\"mr-2\">
        {badgeText}
      </Badge>

      {tooltipText && (
        <span className=\"text-xs text-muted-foreground truncate max-w-[200px]\" title={tooltipText}>
          {tooltipText}
        </span>
      )}
    </div>
  );
}

```

#### Server Details Modal with Logs

```tsx
// web/src/components/shared/tools/ServerDetailsModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ServerStatusIndicator } from './ServerStatusIndicator';
import { api } from '@/lib/api';

interface ServerDetailsModalProps {
  serverId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId?: string;
}

export function ServerDetailsModal({
  serverId,
  open,
  onOpenChange,
  workspaceId
}: ServerDetailsModalProps) {
  const [serverStatus, setServerStatus] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('status');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch server status
  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const status = await api.tools.getServerStatus(serverId, workspaceId);
      setServerStatus(status);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch server status');
      console.error('Error fetching server status:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch server logs
  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const response = await api.tools.getServerLogs(serverId, 100, workspaceId);
      setLogs(response.logs || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch server logs');
      console.error('Error fetching server logs:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Restart server
  const handleRestart = async () => {
    try {
      setIsLoading(true);
      await api.tools.restartServer(serverId, workspaceId);
      await fetchStatus();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart server');
      console.error('Error restarting server:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch data when the modal opens or tab changes
  useEffect(() => {
    if (open) {
      fetchStatus();
      
      if (activeTab === 'logs') {
        fetchLogs();
      }
    }
  }, [open, activeTab, serverId]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className=\"sm:max-w-[600px]\">
        <DialogHeader>
          <DialogTitle>Server Details: {serverId}</DialogTitle>
          <DialogDescription>
            View server status, logs, and manage the server
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className=\"grid w-full grid-cols-2\">
            <TabsTrigger value=\"status\">Status</TabsTrigger>
            <TabsTrigger value=\"logs\">Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value=\"status\" className=\"py-4\">
            {isLoading && <div className=\"text-center py-4\">Loading...</div>}
            
            {!isLoading && serverStatus && (
              <div className=\"space-y-4\">
                <div className=\"flex justify-between items-center\">
                  <span className=\"font-medium\">Status:</span>
                  <ServerStatusIndicator 
                    status={serverStatus.status} 
                    error={serverStatus.error}
                    lastRetry={serverStatus.lastRetryTimestamp}
                    retryCount={serverStatus.retryCount}
                  />
                </div>
                
                {serverStatus.error && (
                  <div className=\"mt-4\">
                    <h4 className=\"text-sm font-medium mb-1\">Error:</h4>
                    <pre className=\"bg-destructive/10 p-2 rounded text-xs text-destructive overflow-auto\">
                      {serverStatus.error}
                    </pre>
                  </div>
                )}
                
                <div className=\"flex justify-end pt-4\">
                  <Button 
                    onClick={handleRestart} 
                    disabled={isLoading}
                    variant=\"outline\"
                    className=\"mr-2\"
                  >
                    Restart Server
                  </Button>
                  <Button 
                    onClick={fetchStatus} 
                    disabled={isLoading}
                    variant=\"default\"
                  >
                    Refresh
                  </Button>
                </div>
              </div>
            )}
            
            {error && (
              <div className=\"bg-destructive/10 p-4 rounded\">
                <p className=\"text-destructive\">{error}</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value=\"logs\" className=\"py-4\">
            {isLoading && <div className=\"text-center py-4\">Loading logs...</div>}
            
            <div className=\"flex justify-end mb-4\">
              <Button 
                onClick={fetchLogs}
                disabled={isLoading}
                variant=\"outline\"
                size=\"sm\"
              >
                Refresh Logs
              </Button>
            </div>
            
            <div className=\"bg-secondary p-4 rounded h-[300px] overflow-auto\">
              {logs.length > 0 ? (
                <pre className=\"text-xs whitespace-pre-wrap\">
                  {logs.join('\
')}
                </pre>
              ) : (
                <p className=\"text-center text-muted-foreground\">No logs available</p>
              )}
            </div>
            
            {error && (
              <div className=\"mt-4 bg-destructive/10 p-4 rounded\">
                <p className=\"text-destructive\">{error}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

### 2. Improved Tool Execution UI with Completions

#### Enhanced Method Arguments Form with Completions

```tsx
// web/src/components/shared/tools/MethodExecutionPanel.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Loader2 } from 'lucide-react';
import { useToolCompletions } from '@/hooks/useToolCompletions';

interface MethodExecutionPanelProps {
  serverId: string;
  methodName: string;
  methodDetails: any;
  onExecute: (params: any) => Promise<any>;
  workspaceId?: string;
}

export function MethodExecutionPanel({
  serverId,
  methodName,
  methodDetails,
  onExecute,
  workspaceId
}: MethodExecutionPanelProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Get completion functionality
  const {
    completions,
    loading: completionsLoading,
    requestCompletions,
    clearCompletions
  } = useToolCompletions({
    serverId,
    methodName
  });
  
  // Build the form schema dynamically based on method parameters
  const buildFormSchema = () => {
    if (!methodDetails?.parameters) {
      return z.object({});
    }
    
    const schemaObj: Record<string, any> = {};
    
    Object.entries(methodDetails.parameters.properties || {}).forEach(([key, prop]: [string, any]) => {
      // Handle required fields
      const isRequired = methodDetails.parameters.required?.includes(key);
      
      let fieldSchema;
      
      // Build schema based on type
      switch (prop.type) {
        case 'string':
          fieldSchema = z.string();
          break;
        case 'number':
          fieldSchema = z.number().or(z.string().transform((val) => {
            const parsed = parseFloat(val);
            return isNaN(parsed) ? undefined : parsed;
          }));
          break;
        case 'boolean':
          fieldSchema = z.boolean().or(z.string().transform((val) => {
            if (val === 'true') return true;
            if (val === 'false') return false;
            return undefined;
          }));
          break;
        case 'array':
          fieldSchema = z.string().transform((val) => {
            try {
              return JSON.parse(val);
            } catch (e) {
              return [];
            }
          });
          break;
        case 'object':
          fieldSchema = z.string().transform((val) => {
            try {
              return JSON.parse(val);
            } catch (e) {
              return {};
            }
          });
          break;
        default:
          fieldSchema = z.string();
          break;
      }
      
      // Make field optional if not required
      schemaObj[key] = isRequired ? fieldSchema : fieldSchema.optional();
    });
    
    return z.object(schemaObj);
  };
  
  const formSchema = buildFormSchema();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });
  
  // Handler for form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsExecuting(true);
      setError(null);
      
      // Execute the method
      const executeResult = await onExecute(values);
      
      setResult(executeResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute method');
      console.error('Error executing method:', err);
    } finally {
      setIsExecuting(false);
    }
  };
  
  // Handle input changes to fetch completions
  const handleInputChange = (field: string, value: string) => {
    if (value.trim().length > 0) {
      requestCompletions(field, value);
    } else {
      clearCompletions();
    }
  };
  
  // Clear result when method changes
  useEffect(() => {
    setResult(null);
    setError(null);
    clearCompletions();
    form.reset();
  }, [methodName, serverId]);
  
  // Helper to render the form field based on parameter type
  const renderFormField = (name: string, parameter: any) => {
    const hasCompletions = completions[name] && completions[name].length > 0;
    
    switch (parameter.type) {
      case 'string':
        return (
          <FormItem key={name}>
            <FormLabel>{parameter.title || name}</FormLabel>
            <FormControl>
              <div className=\"relative\">
                <Popover open={hasCompletions}>
                  <PopoverTrigger asChild>
                    <Input
                      placeholder={parameter.description || ''}
                      {...form.register(name)}
                      onChange={(e) => {
                        form.register(name).onChange(e);
                        handleInputChange(name, e.target.value);
                      }}
                    />
                  </PopoverTrigger>
                  {hasCompletions && (
                    <PopoverContent className=\"w-[200px] p-0\" align=\"start\">
                      <div className=\"max-h-[200px] overflow-auto\">
                        {completions[name].map((suggestion, i) => (
                          <div
                            key={i}
                            className=\"px-2 py-1 hover:bg-accent cursor-pointer\"
                            onClick={() => {
                              form.setValue(name, suggestion);
                              clearCompletions();
                            }}
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  )}
                </Popover>
                {completionsLoading[name] && (
                  <div className=\"absolute right-2 top-2\">
                    <Loader2 className=\"h-4 w-4 animate-spin\" />
                  </div>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
        
      case 'number':
        return (
          <FormItem key={name}>
            <FormLabel>{parameter.title || name}</FormLabel>
            <FormControl>
              <Input
                type=\"number\"
                placeholder={parameter.description || ''}
                {...form.register(name)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );
        
      case 'boolean':
        return (
          <FormItem key={name}>
            <FormLabel>{parameter.title || name}</FormLabel>
            <FormControl>
              <Select
                onValueChange={(value) => form.setValue(name, value === 'true')}
                defaultValue={form.getValues(name)?.toString() || ''}
              >
                <SelectTrigger>
                  <SelectValue placeholder={parameter.description || 'Select value'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=\"true\">True</SelectItem>
                  <SelectItem value=\"false\">False</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
        
      case 'array':
      case 'object':
        return (
          <FormItem key={name}>
            <FormLabel>{parameter.title || name}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={`Enter JSON ${parameter.type === 'array' ? 'array' : 'object'}`}
                {...form.register(name)}
                className=\"min-h-[100px] font-mono text-sm\"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );
        
      default:
        return (
          <FormItem key={name}>
            <FormLabel>{parameter.title || name}</FormLabel>
            <FormControl>
              <Input
                placeholder={parameter.description || ''}
                {...form.register(name)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );
    }
  };
  
  return (
    <div className=\"space-y-6\">
      <div>
        <h3 className=\"text-lg font-medium\">Execute Method: {methodName}</h3>
        <p className=\"text-sm text-muted-foreground mt-1\">
          {methodDetails?.description || 'No description available'}
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className=\"space-y-4\">
          {methodDetails?.parameters?.properties ? (
            <div className=\"space-y-4\">
              {Object.entries(methodDetails.parameters.properties).map(([name, param]) => 
                renderFormField(name, param)
              )}
            </div>
          ) : (
            <p className=\"text-sm text-muted-foreground\">No parameters required</p>
          )}
          
          <Button type=\"submit\" disabled={isExecuting}>
            {isExecuting && <Loader2 className=\"mr-2 h-4 w-4 animate-spin\" />}
            Execute
          </Button>
        </form>
      </Form>
      
      {error && (
        <div className=\"mt-4 bg-destructive/10 p-4 rounded\">
          <h4 className=\"text-sm font-medium mb-1\">Error:</h4>
          <pre className=\"text-xs text-destructive overflow-auto whitespace-pre-wrap\">
            {error}
          </pre>
        </div>
      )}
      
      {result && (
        <div className=\"mt-4\">
          <h4 className=\"text-sm font-medium mb-1\">Result:</h4>
          <pre className=\"bg-secondary p-4 rounded text-xs overflow-auto whitespace-pre-wrap\">
            {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
```

### 3. Server List with Enhanced Status

```tsx
// web/src/components/shared/tools/ServerListItem.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ServerStatusIndicator } from './ServerStatusIndicator';
import { Power, PowerOff, Info, Settings, Play, Trash } from 'lucide-react';

interface ServerListItemProps {
  id: string;
  config: any;
  status: any;
  onStart: () => void;
  onStop: () => void;
  onViewDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDisabled: boolean;
  onToggleDisabled: () => void;
}

export function ServerListItem({
  id,
  config,
  status,
  onStart,
  onStop,
  onViewDetails,
  onEdit,
  onDelete,
  isDisabled,
  onToggleDisabled
}: ServerListItemProps) {
  const isRunning = status?.status === 'connected';
  const hasError = status?.status === 'error';
  
  return (
    <Card className={isDisabled ? 'opacity-70' : ''}>
      <CardContent className=\"pt-6\">
        <div className=\"flex justify-between items-start\">
          <div>
            <h3 className=\"text-lg font-medium\">{id}</h3>
            <p className=\"text-sm text-muted-foreground mt-1 truncate max-w-[300px]\">
              {config.command} {Array.isArray(config.args) ? config.args.join(' ') : ''}
            </p>
          </div>
          
          <ServerStatusIndicator
            status={status?.status}
            error={status?.error}
            lastRetry={status?.lastRetryTimestamp}
            retryCount={status?.retryCount}
          />
        </div>
      </CardContent>
      
      <CardFooter className=\"pt-0 flex justify-end\">
        <div className=\"flex gap-2\">
          {isRunning ? (
            <Button variant=\"ghost\" size=\"sm\" onClick={onStop} title=\"Stop Server\">
              <PowerOff className=\"h-4 w-4\" />
            </Button>
          ) : (
            <Button 
              variant=\"ghost\" 
              size=\"sm\" 
              onClick={onStart} 
              disabled={isDisabled}
              title=\"Start Server\"
            >
              <Power className=\"h-4 w-4\" />
            </Button>
          )}
          
          <Button variant=\"ghost\" size=\"sm\" onClick={onViewDetails} title=\"View Details\">
            <Info className=\"h-4 w-4\" />
          </Button>
          
          <Button variant=\"ghost\" size=\"sm\" onClick={onEdit} title=\"Edit Configuration\">
            <Settings className=\"h-4 w-4\" />
          </Button>
          
          <Button 
            variant=\"ghost\" 
            size=\"sm\" 
            onClick={onToggleDisabled} 
            title={isDisabled ? \"Enable Server\" : \"Disable Server\"}
          >
            <Play className={`h-4 w-4 ${isDisabled ? 'text-muted-foreground' : ''}`} />
          </Button>
          
          <Button 
            variant=\"ghost\" 
            size=\"sm\" 
            onClick={onDelete} 
            className=\"text-destructive hover:text-destructive/80\"
            title=\"Delete Server\"
          >
            <Trash className=\"h-4 w-4\" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
```

### 4. Enhanced Server Tabs Component

```tsx
// web/src/components/shared/tools/ServerTabs.tsx
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { ServerListItem } from './ServerListItem';
import { ServerDetailsModal } from './ServerDetailsModal';
import { ServerEditModal } from './ServerEditModal';
import { AddServerModal } from './AddServerModal';
import { useToolsConfig } from './hooks';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ServerTabsProps {
  workspaceId?: string;
}

export function ServerTabs({ workspaceId }: ServerTabsProps) {
  const {
    toolsData,
    selectedConfigId,
    serverStatus,
    handleSelectConfig,
    handleToggleServerDisabled,
    handleEditServer,
    startServer,
    stopServer,
    loadServerStatus,
    isLoading,
    error
  } = useToolsConfig(workspaceId);
  
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addServerModalOpen, setAddServerModalOpen] = useState(false);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  
  // Polling for server status
  useEffect(() => {
    const interval = setInterval(() => {
      loadServerStatus(workspaceId);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [loadServerStatus, workspaceId]);
  
  // Handler for viewing server details
  const handleViewDetails = (serverId: string) => {
    setSelectedServerId(serverId);
    setDetailsModalOpen(true);
  };
  
  // Handler for editing server
  const handleEdit = (serverId: string) => {
    setSelectedServerId(serverId);
    setEditModalOpen(true);
  };
  
  // Handler for starting server
  const handleStartServer = async (serverId: string) => {
    if (!selectedConfigId || !toolsData) return;
    
    try {
      const config = toolsData.configs[selectedConfigId][serverId];
      await startServer(serverId, config, workspaceId);
    } catch (err) {
      console.error('Failed to start server:', err);
    }
  };
  
  // Handler for stopping server
  const handleStopServer = async (serverId: string) => {
    try {
      await stopServer(serverId, workspaceId);
    } catch (err) {
      console.error('Failed to stop server:', err);
    }
  };
  
  // Render tabs for each config
  const renderConfigTabs = () => {
    if (!toolsData || !toolsData.configs) {
      return <div>No configurations available</div>;
    }
    
    return (
      <Tabs
        value={selectedConfigId || ''}
        onValueChange={handleSelectConfig}
        className=\"w-full\"
      >
        <div className=\"flex justify-between items-center mb-4\">
          <TabsList>
            {Object.keys(toolsData.configs).map(configId => (
              <TabsTrigger key={configId} value={configId}>
                {configId}
                {toolsData.active === configId && (
                  <span className=\"ml-2 bg-green-500 w-2 h-2 rounded-full\"></span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <div className=\"flex gap-2\">
            <Button 
              size=\"sm\" 
              variant=\"outline\" 
              onClick={() => loadServerStatus(workspaceId)}
              disabled={isLoading}
            >
              <RefreshCw className=\"h-4 w-4 mr-2\" />
              Refresh
            </Button>
            
            <Button 
              size=\"sm\" 
              onClick={() => setAddServerModalOpen(true)}
              disabled={!selectedConfigId}
            >
              <Plus className=\"h-4 w-4 mr-2\" />
              Add Server
            </Button>
          </div>
        </div>
        
        {Object.keys(toolsData.configs).map(configId => (
          <TabsContent key={configId} value={configId} className=\"space-y-4\">
            {error && (
              <Alert variant=\"destructive\">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {Object.keys(toolsData.configs[configId]).length === 0 ? (
              <div className=\"text-center py-8 text-muted-foreground\">
                <p>No servers in this configuration</p>
                <Button 
                  variant=\"outline\" 
                  className=\"mt-4\"
                  onClick={() => setAddServerModalOpen(true)}
                >
                  <Plus className=\"h-4 w-4 mr-2\" />
                  Add Server
                </Button>
              </div>
            ) : (
              <div className=\"grid gap-4 md:grid-cols-2\">
                {Object.entries(toolsData.configs[configId]).map(([serverId, config]) => (
                  <ServerListItem
                    key={serverId}
                    id={serverId}
                    config={config}
                    status={serverStatus?.[serverId]}
                    onStart={() => handleStartServer(serverId)}
                    onStop={() => handleStopServer(serverId)}
                    onViewDetails={() => handleViewDetails(serverId)}
                    onEdit={() => handleEdit(serverId)}
                    onDelete={() => {}} // Implement delete functionality
                    isDisabled={config.disabled || false}
                    onToggleDisabled={() => handleToggleServerDisabled(configId, serverId)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    );
  };
  
  return (
    <div>
      {renderConfigTabs()}
      
      {selectedServerId && (
        <>
          <ServerDetailsModal
            serverId={selectedServerId}
            open={detailsModalOpen}
            onOpenChange={setDetailsModalOpen}
            workspaceId={workspaceId}
          />
          
          <ServerEditModal
            serverId={selectedServerId}
            configId={selectedConfigId || ''}
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            workspaceId={workspaceId}
          />
        </>
      )}
      
      <AddServerModal
        configId={selectedConfigId || ''}
        open={addServerModalOpen}
        onOpenChange={setAddServerModalOpen}
        workspaceId={workspaceId}
      />
    </div>
  );
}
```

## Testing Approach

For Phase 3, we'll use an integration testing approach with real servers and real user interactions:

1. **Component Testing**
   - Test UI components with real data from MCP servers
   - Verify proper rendering of server status, logs, and errors
   - Test form validation and submission

2. **User Interaction Testing**
   - Test completions functionality with actual typing behavior
   - Verify error handling and feedback for users
   - Test accessibility and keyboard navigation

3. **Integration Testing**
   - End-to-end testing of the complete workflow
   - Performance testing with large numbers of servers and tools
   - Cross-browser compatibility testing

## Success Criteria

1. **Functionality**
   - Server status updates properly reflect real server state
   - Completions work correctly with supported servers
   - Tool execution works with all parameter types
   - Error handling provides useful feedback

2. **User Experience**
   - UI is intuitive and responsive
   - Status polling doesn't cause flickering or UI instability
   - Forms handle validation gracefully
   - Visual feedback is clear and consistent

3. **Integration**
   - Components work seamlessly with the enhanced API layer
   - Real-time updates propagate correctly
   - Handles large responses gracefully
   - Works with all existing MCP server types

## Success Criteria

1. **User Experience**
   - More intuitive server management
   - Better visibility into server status and errors
   - Faster tool execution with completions
   - Improved error feedback

2. **Functionality**
   - All components work with the enhanced API
   - Real-time status updates function correctly
   - Completions work for supported tools
   - Log viewing provides useful debugging information

3. **Performance**
   - UI remains responsive even with many servers
   - Status polling doesn't cause excessive load
   - Tool execution with large responses handles gracefully

## Integration with Existing Code

The enhanced UI components will need to work with the updated API and hooks created in Phase 2, using the SDK adapters created in Phase 1. This integration will require:

1. **Store Updates**
   - Update the Zustand store to work with new API endpoints
   - Add support for completions state
   - Enhance error handling in the store

2. **Hook Implementation**
   - Ensure custom hooks work with the enhanced components
   - Update the useToolsConfig hook to support new functionality

3. **Component Integration**
   - Replace existing components incrementally to minimize disruption
   - Update prop interfaces as needed
   - Maintain compatibility with existing patterns
