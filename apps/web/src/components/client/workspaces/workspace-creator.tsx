'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspacesStore } from '@/store';
import { CreateWorkspaceInput } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function WorkspaceCreator() {
  const router = useRouter();
  const { createWorkspace, isLoading, error } = useWorkspacesStore();
  
  const [formData, setFormData] = useState<CreateWorkspaceInput>({
    name: '',
    description: '',
    path: '',
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const workspace = await createWorkspace(formData);
      toast({
        title: 'Workspace created',
        description: `Successfully created workspace: ${workspace.name}`,
        duration: 3000,
      });
      router.push(`/workspaces/${workspace.id}`);
    } catch (err) {
      // Error is handled by the store and displayed in the UI
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Workspace</CardTitle>
        <CardDescription>
          Create a new workspace to organize your AI projects
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="My Workspace"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="A brief description of the workspace"
              value={formData.description}
              onChange={handleChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="path">
              Custom Path <span className="text-sm text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="path"
              name="path"
              placeholder="/path/to/workspace"
              value={formData.path}
              onChange={handleChange}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use the default location
            </p>
          </div>
          
          {error && (
            <div className="rounded-md bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !formData.name}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Create Workspace
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
