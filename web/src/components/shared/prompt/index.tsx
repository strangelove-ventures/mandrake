'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@radix-ui/react-label';
import { PromptComponentProps } from './types';
import { usePromptConfig } from './hooks';
import PromptEditor from './PromptEditor';

/**
 * PromptConfig component that can be used in both system and workspace contexts
 */
export default function PromptConfig({ isWorkspace = false, workspaceId }: PromptComponentProps) {
  const {
    promptData,
    isEditingPrompt,
    editingPrompt,
    promptConfigError,
    isLoading,
    error,
    
    setIsEditingPrompt,
    
    handleEditPrompt,
    handleSavePromptEdits,
    handleToggleOption,
    
    reloadConfig
  } = usePromptConfig(isWorkspace ? workspaceId : undefined);
  
  // If loading, show a loading state
  if (isLoading) {
    return <div className="text-center p-4">Loading prompt configuration...</div>;
  }
  
  // If no data yet, show an error or loading state
  if (!promptData) {
    return (
      <div className="text-center p-4">
        <h2 className="text-2xl font-bold mb-4">Prompt Configuration</h2>
        <div className="p-8 border rounded-lg bg-gray-50 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No prompt configuration found. This could be due to:
          </p>
          <ul className="list-disc pl-5 text-gray-500 dark:text-gray-400 text-left">
            <li>API connection issue - check the backend is running on port 4000</li>
            <li>Missing configuration file - default should be created automatically</li>
            <li>Permission issues accessing configuration directory</li>
          </ul>
          <Button 
            onClick={reloadConfig}
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
        <h2 className="text-2xl font-bold">Prompt Configuration</h2>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>System Prompt</CardTitle>
          <CardDescription>
            Configure the system prompt used for AI conversations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-md bg-muted/40">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-sm font-medium">Current Instructions</h3>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleEditPrompt}
                >
                  Edit
                </Button>
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm font-mono leading-relaxed max-h-60 overflow-y-auto">
                {promptData.instructions || <span className="text-muted-foreground italic">No instructions set</span>}
              </div>
            </div>
            
            <div className="border rounded-md p-4 space-y-4">
              <h3 className="text-sm font-medium">Additional Inclusions</h3>
              
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="workspace-metadata"
                  checked={promptData.includeWorkspaceMetadata}
                  onCheckedChange={() => handleToggleOption('includeWorkspaceMetadata')}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="workspace-metadata" className="text-sm font-medium">
                    Workspace Metadata
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Include workspace information in the prompt.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="system-info"
                  checked={promptData.includeSystemInfo}
                  onCheckedChange={() => handleToggleOption('includeSystemInfo')}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="system-info" className="text-sm font-medium">
                    System Information
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Include information about available tools and system capabilities.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="date-time"
                  checked={promptData.includeDateTime}
                  onCheckedChange={() => handleToggleOption('includeDateTime')}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="date-time" className="text-sm font-medium">
                    Date and Time
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Include current date and time in the prompt.
                  </p>
                </div>
              </div>
            </div>
            
            {promptConfigError && (
              <Alert variant="destructive">
                <AlertDescription>
                  Error in prompt configuration: {promptConfigError}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Prompt edit dialog */}
      <PromptEditor
        isOpen={isEditingPrompt}
        onClose={() => setIsEditingPrompt(false)}
        editingPrompt={editingPrompt}
        onSave={handleSavePromptEdits}
      />
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}
    </div>
  );
}

// Named exports for individual components
export { default as PromptEditor } from './PromptEditor';
export { usePromptConfig } from './hooks';
