'use client';

import { useState, useEffect } from 'react';
import { useWorkspace, useWorkspaceConfig, useUpdateWorkspaceConfig } from '@/hooks/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface WorkspaceConfigProps {
  workspaceId: string;
}

export default function WorkspaceConfig({ workspaceId }: WorkspaceConfigProps) {
  const { data: workspace, isLoading: workspaceLoading } = useWorkspace(workspaceId);
  const { data: config, isLoading: configLoading } = useWorkspaceConfig(workspaceId);
  const updateConfig = useUpdateWorkspaceConfig();
  
  const [metadata, setMetadata] = useState('{}');
  const [isEditing, setIsEditing] = useState(false);
  
  // Set initial values when data loads
  useEffect(() => {
    if (config) {
      try {
        const formattedMetadata = JSON.stringify(config.metadata || {}, null, 2);
        setMetadata(formattedMetadata);
      } catch (e) {
        console.error('Error parsing metadata:', e);
        setMetadata('{}');
      }
    }
  }, [config]);
  
  // Handle save
  const handleSave = async () => {
    try {
      const parsedMetadata = JSON.parse(metadata);
      
      await updateConfig.mutateAsync({
        id: workspaceId,
        config: {
          ...config,
          metadata: parsedMetadata
        }
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update workspace config:', error);
      alert('Invalid JSON format for metadata');
    }
  };
  
  // Handle cancel
  const handleCancel = () => {
    if (config) {
      try {
        const formattedMetadata = JSON.stringify(config.metadata || {}, null, 2);
        setMetadata(formattedMetadata);
      } catch (e) {
        setMetadata('{}');
      }
    }
    setIsEditing(false);
  };
  
  const isLoading = workspaceLoading || configLoading;
  
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-md w-full"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-md w-full"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-md w-full"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium mb-4">Workspace Configuration</h3>
      
      <Accordion type="multiple" className="w-full">
        <AccordionItem value="details">
          <AccordionTrigger>Workspace Details</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                  {workspace?.name}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">ID</label>
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md font-mono text-sm">
                  {workspace?.id}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Path</label>
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md font-mono text-sm truncate">
                  {workspace?.path}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Created</label>
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-sm">
                  {config?.created ? new Date(config.created).toLocaleString() : 'Unknown'}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="metadata">
          <AccordionTrigger>Metadata</AccordionTrigger>
          <AccordionContent>
            <div className="pt-2">
              {isEditing ? (
                <div className="space-y-3">
                  <Textarea
                    value={metadata}
                    onChange={(e) => setMetadata(e.target.value)}
                    placeholder="Enter JSON metadata"
                    className="h-48 font-mono text-sm"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={updateConfig.isPending}>
                      {updateConfig.isPending ? 'Saving...' : 'Save'}
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md min-h-24 font-mono text-sm whitespace-pre">
                    {JSON.stringify(config?.metadata || {}, null, 2)}
                  </div>
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    Edit Metadata
                  </Button>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}