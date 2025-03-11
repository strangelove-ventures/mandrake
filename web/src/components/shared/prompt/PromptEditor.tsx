'use client';

import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@radix-ui/react-label';
import { PromptEditState } from './types';

interface PromptEditorProps {
  isOpen: boolean;
  onClose: () => void;
  editingPrompt: PromptEditState | null;
  onSave: (config: PromptEditState) => void;
}

export default function PromptEditor({ 
  isOpen, 
  onClose, 
  editingPrompt, 
  onSave 
}: PromptEditorProps) {
  const [localPrompt, setLocalPrompt] = useState<PromptEditState | null>(editingPrompt);
  
  // Handle dialog closing and reset local state
  const handleClose = () => {
    onClose();
  };
  
  // Handle saving changes
  const handleSave = () => {
    if (localPrompt) {
      onSave(localPrompt);
    }
  };
  
  // Update local state when the editing prompt changes
  if (editingPrompt && (!localPrompt || JSON.stringify(localPrompt) !== JSON.stringify(editingPrompt))) {
    setLocalPrompt(editingPrompt);
  }
  
  if (!localPrompt) {
    return null;
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit System Prompt</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-6">
          {/* Main instructions editor */}
          <div>
            <Label htmlFor="instructions" className="block text-sm font-medium mb-1">
              System Instructions
            </Label>
            <Textarea
              id="instructions"
              value={localPrompt.instructions}
              onChange={(e) => setLocalPrompt({
                ...localPrompt,
                instructions: e.target.value
              })}
              className="w-full h-64 font-mono text-sm resize-none"
              placeholder="Enter system instructions for the AI assistant..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              These instructions define how the AI assistant will behave in conversations.
            </p>
          </div>
          
          {/* Options checkboxes */}
          <div className="space-y-4 border rounded-md p-4">
            <h3 className="text-sm font-medium mb-2">Prompt Inclusions</h3>
            
            <div className="flex items-start space-x-2">
              <Checkbox 
                id="includeWorkspaceMetadata"
                checked={localPrompt.includeWorkspaceMetadata}
                onCheckedChange={(checked) => setLocalPrompt({
                  ...localPrompt,
                  includeWorkspaceMetadata: checked === true
                })}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="includeWorkspaceMetadata" className="text-sm font-medium">
                  Include Workspace Metadata
                </Label>
                <p className="text-xs text-muted-foreground">
                  Add workspace name, description, and other metadata to the prompt.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <Checkbox 
                id="includeSystemInfo"
                checked={localPrompt.includeSystemInfo}
                onCheckedChange={(checked) => setLocalPrompt({
                  ...localPrompt,
                  includeSystemInfo: checked === true
                })}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="includeSystemInfo" className="text-sm font-medium">
                  Include System Information
                </Label>
                <p className="text-xs text-muted-foreground">
                  Add system information such as available tools and capabilities.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <Checkbox 
                id="includeDateTime"
                checked={localPrompt.includeDateTime}
                onCheckedChange={(checked) => setLocalPrompt({
                  ...localPrompt,
                  includeDateTime: checked === true
                })}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="includeDateTime" className="text-sm font-medium">
                  Include Date and Time
                </Label>
                <p className="text-xs text-muted-foreground">
                  Add current date and time information to the prompt.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
