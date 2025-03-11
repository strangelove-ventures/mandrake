'use client';

import { useState, useEffect } from 'react';
import { 
  useDynamicContextList, 
  useCreateDynamicContext, 
  useUpdateDynamicContext,
  useToggleDynamicContextEnabled,
  useDeleteDynamicContext
} from '@/hooks/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';

interface DynamicContextConfigProps {
  workspaceId: string;
}

export default function DynamicContextConfig({ workspaceId }: DynamicContextConfigProps) {
  const { data: contextMethods, isLoading } = useDynamicContextList(workspaceId);
  const createMutation = useCreateDynamicContext(workspaceId);
  const updateMutation = useUpdateDynamicContext(workspaceId);
  const toggleMutation = useToggleDynamicContextEnabled(workspaceId);
  const deleteMutation = useDeleteDynamicContext(workspaceId);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newMethod, setNewMethod] = useState({
    serverId: '',
    methodName: '',
    params: '{}',
    refresh: {
      enabled: true,
      interval: '1h',
      onDemand: true
    }
  });
  
  // Handle create new method
  const handleCreate = async () => {
    try {
      // Parse params as JSON
      const parsedParams = JSON.parse(newMethod.params);
      
      await createMutation.mutateAsync({
        ...newMethod,
        params: parsedParams
      });
      
      // Reset form
      setNewMethod({
        serverId: '',
        methodName: '',
        params: '{}',
        refresh: {
          enabled: true,
          interval: '1h',
          onDemand: true
        }
      });
      
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating dynamic context method:', error);
      alert('Invalid JSON in params field');
    }
  };
  
  // Handle toggle enabled status
  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    await toggleMutation.mutateAsync({ id, enabled });
  };
  
  // Handle delete
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this context method?')) {
      await deleteMutation.mutateAsync(id);
    }
  };
  
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }
  
  const hasContextMethods = contextMethods && contextMethods.length > 0;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Dynamic Context Methods</h3>
        <Button onClick={() => setIsCreating(!isCreating)}>
          {isCreating ? 'Cancel' : 'Add Method'}
        </Button>
      </div>
      
      {isCreating && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
          <h4 className="font-medium">New Dynamic Context Method</h4>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium">Server ID</label>
            <Input
              value={newMethod.serverId}
              onChange={(e) => setNewMethod({...newMethod, serverId: e.target.value})}
              placeholder="Server ID"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium">Method Name</label>
            <Input
              value={newMethod.methodName}
              onChange={(e) => setNewMethod({...newMethod, methodName: e.target.value})}
              placeholder="Method name"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium">Parameters (JSON)</label>
            <Textarea
              value={newMethod.params}
              onChange={(e) => setNewMethod({...newMethod, params: e.target.value})}
              placeholder="{}"
              className="font-mono"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium">Refresh Interval</label>
            <Input
              value={newMethod.refresh.interval}
              onChange={(e) => setNewMethod({
                ...newMethod, 
                refresh: {...newMethod.refresh, interval: e.target.value}
              })}
              placeholder="1h"
            />
            <p className="text-xs text-gray-500">
              Format: 30s, 5m, 1h, etc.
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={newMethod.refresh.enabled}
              onCheckedChange={(checked) => setNewMethod({
                ...newMethod,
                refresh: {...newMethod.refresh, enabled: checked}
              })}
            />
            <label className="text-sm font-medium">Enabled</label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={newMethod.refresh.onDemand}
              onCheckedChange={(checked) => setNewMethod({
                ...newMethod,
                refresh: {...newMethod.refresh, onDemand: checked}
              })}
            />
            <label className="text-sm font-medium">Allow On-Demand Refresh</label>
          </div>
          
          <div className="pt-2">
            <Button 
              onClick={handleCreate} 
              disabled={
                createMutation.isPending || 
                !newMethod.serverId || 
                !newMethod.methodName
              }
            >
              {createMutation.isPending ? 'Creating...' : 'Create Method'}
            </Button>
          </div>
        </div>
      )}
      
      {hasContextMethods ? (
        <Accordion type="multiple" className="w-full">
          {contextMethods.map((method) => (
            <AccordionItem key={method.id} value={method.id} className="border-b">
              <AccordionTrigger className="py-4">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔄</span>
                    <span>{method.methodName}</span>
                  </div>
                  <div 
                    className={`rounded-full h-3 w-3 ${
                      method.refresh.enabled ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleEnabled(method.id, !method.refresh.enabled);
                    }}
                  ></div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Server ID</label>
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md font-mono text-sm">
                        {method.serverId}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Method Name</label>
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md font-mono text-sm">
                        {method.methodName}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Parameters</label>
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md font-mono text-sm whitespace-pre">
                      {JSON.stringify(method.params, null, 2)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Refresh Interval</label>
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                        {method.refresh.interval || 'Not set'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">On-Demand Refresh</label>
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                        {method.refresh.onDemand ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-2 flex justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={method.refresh.enabled}
                        onCheckedChange={(checked) => handleToggleEnabled(method.id, checked)}
                      />
                      <label className="text-sm font-medium">
                        {method.refresh.enabled ? 'Enabled' : 'Disabled'}
                      </label>
                    </div>
                    
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDelete(method.id)}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
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
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" 
            />
          </svg>
          <h4 className="text-lg font-medium mb-2">No Dynamic Context Methods</h4>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Add dynamic context methods to enhance your AI sessions with relevant data.
          </p>
        </div>
      )}
    </div>
  );
}