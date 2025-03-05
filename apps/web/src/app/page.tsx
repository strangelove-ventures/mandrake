'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FolderOpen, Plus, Settings, Box, FileText } from 'lucide-react';

export default function Page() {
  // State for workspaces
  const [workspaces, setWorkspaces] = useState([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);
  const [workspacesError, setWorkspacesError] = useState(null);
  
  // State for sessions
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  
  // Fetch workspaces
  useEffect(() => {
    async function fetchWorkspaces() {
      try {
        setWorkspacesLoading(true);
        const response = await fetch('/api/workspaces');
        if (!response.ok) {
          throw new Error(`Failed to fetch workspaces: ${response.statusText}`);
        }
        const data = await response.json();
        setWorkspaces(data);
      } catch (error) {
        console.error('Error fetching workspaces:', error);
        setWorkspacesError(error.message);
      } finally {
        setWorkspacesLoading(false);
      }
    }
    
    fetchWorkspaces();
  }, []);
  
  // Fetch sessions (mock for now)
  useEffect(() => {
    // Mock sessions data for now
    setTimeout(() => {
      setSessions([
        { id: 'session-1', name: 'GPT Chat', createdAt: '2023-05-10T12:30:00Z' },
        { id: 'session-2', name: 'Research Assistant', createdAt: '2023-05-15T15:45:00Z' }
      ]);
      setSessionsLoading(false);
    }, 500);
  }, []);
  
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4">
          <h1 className="text-xl font-bold tracking-tight">Mandrake</h1>
          <div className="flex-1" />
        </div>
      </header>
      
      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="flex-1 space-y-8">
            {/* Workspaces Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Workspaces</h2>
                <Button asChild>
                  <Link href="/workspaces/new">
                    <Plus className="mr-1 h-4 w-4" />
                    New Workspace
                  </Link>
                </Button>
              </div>
              
              {workspacesLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  Loading workspaces...
                </div>
              ) : workspacesError ? (
                <div className="p-4 bg-destructive/10 text-destructive rounded-md">
                  Error loading workspaces: {workspacesError}
                </div>
              ) : workspaces.length === 0 ? (
                <div className="p-8 text-center">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No workspaces yet. Create your first workspace to get started.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {workspaces.map((workspace) => (
                    <Card key={workspace.id}>
                      <CardHeader>
                        <CardTitle>{workspace.name}</CardTitle>
                        <CardDescription>{workspace.description || 'No description'}</CardDescription>
                      </CardHeader>
                      <CardFooter>
                        <Button asChild className="w-full">
                          <Link href={`/workspaces/${workspace.id}`}>Open</Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </section>
            
            {/* Sessions Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Sessions</h2>
                <Button asChild variant="outline">
                  <Link href="/sessions/new">
                    <Plus className="mr-1 h-4 w-4" />
                    New Session
                  </Link>
                </Button>
              </div>
              
              {sessionsLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  Loading sessions...
                </div>
              ) : sessions.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">No sessions yet. Start a conversation to create a new session.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {sessions.map((session) => (
                    <Card key={session.id}>
                      <CardHeader>
                        <CardTitle>{session.name}</CardTitle>
                        <CardDescription>
                          Created {new Date(session.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter>
                        <Button asChild variant="outline" className="w-full">
                          <Link href={`/sessions/${session.id}`}>Open</Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
          
          {/* Configuration Section */}
          <div className="lg:w-80 space-y-6">
            <h2 className="text-2xl font-bold">Configuration</h2>
            
            <Tabs defaultValue="models">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="models" className="flex-1">Models</TabsTrigger>
                <TabsTrigger value="tools" className="flex-1">Tools</TabsTrigger>
                <TabsTrigger value="prompt" className="flex-1">Prompt</TabsTrigger>
              </TabsList>
              
              <TabsContent value="models">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Box className="mr-2 h-5 w-5" />
                      Models
                    </CardTitle>
                    <CardDescription>
                      Configure AI models for your conversations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Active model: <span className="font-medium">GPT-4</span>
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full">
                      <Link href="/models">Manage Models</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              <TabsContent value="tools">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Settings className="mr-2 h-5 w-5" />
                      Tools
                    </CardTitle>
                    <CardDescription>
                      Manage the tools available to your AI
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Active tools: 3 tool servers configured
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full">
                      <Link href="/tools">Manage Tools</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              <TabsContent value="prompt">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="mr-2 h-5 w-5" />
                      Prompt
                    </CardTitle>
                    <CardDescription>
                      Configure system prompt templates
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Customize how AI interprets your instructions
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full">
                      <Link href="/prompt">Edit Prompt</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
