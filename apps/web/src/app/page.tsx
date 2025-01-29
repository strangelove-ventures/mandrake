// apps/web/src/app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useWorkspaceStore } from '@/lib/stores/workspace'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Plus } from 'lucide-react'

export default function HomePage() {
  const { workspaces, loading, error, loadWorkspaces, createWorkspace } = useWorkspaceStore()
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    loadWorkspaces()
  }, [loadWorkspaces])

  const handleCreate = async () => {
    try {
      await createWorkspace(newName, newDescription)
      setNewName('')
      setNewDescription('')
      setSheetOpen(false)
    } catch (error) {
      console.error('Failed to create workspace:', error)
    }
  }

  return (
    <main className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Workspaces</h1>
          <p className="text-muted-foreground mt-2">Manage your AI assistant projects</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => loadWorkspaces()}
            disabled={loading}
          >
            Refresh
          </Button>

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Workspace
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Create New Workspace</SheetTitle>
                <SheetDescription>
                  Create a new workspace to manage your AI assistant configuration and context.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 mt-8">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="my-project"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Only letters, numbers, and dashes allowed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Optional project description"
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full mt-6"
                  onClick={handleCreate}
                  disabled={loading || !newName}
                >
                  Create Workspace
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {workspaces.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>No workspaces created yet. Click &quot;New Workspace&quot; to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map(workspace => (
            <Card key={workspace.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{workspace.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {workspace.description && (
                  <p className="text-muted-foreground mb-4">{workspace.description}</p>
                )}
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Created {new Date(workspace.created).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}