'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface MCPServer {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'connecting';
}

// Initial server list with connecting state
const INITIAL_SERVERS: MCPServer[] = [
  { id: 'filesystem', name: 'File System', type: 'filesystem', status: 'connecting' },
  { id: 'git', name: 'Git', type: 'git', status: 'connecting' },
  { id: 'fetch', name: 'Fetch', type: 'fetch', status: 'connecting' }
];

export default function MCPConfigPage() {
  const [servers, setServers] = useState<MCPServer[]>(INITIAL_SERVERS);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newServer, setNewServer] = useState({ name: '', type: '' });
  const { toast } = useToast();

  const fetchServerStates = async () => {
    try {
      const response = await fetch('/api/mcp');
      const data = await response.json();
      if (data.servers) {
        setServers(data.servers);
      }
    } catch (error) {
      console.error('Failed to fetch servers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch MCP servers",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Start polling server states
    const interval = setInterval(fetchServerStates, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleAddServer = async () => {
    try {
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newServer),
      });
      
      if (!response.ok) throw new Error('Failed to add server');
      
      await fetchServerStates();
      setIsDialogOpen(false);
      setNewServer({ name: '', type: '' });
      toast({
        title: "Success",
        description: "MCP server added successfully",
      });
    } catch (error) {
      console.error('Failed to add server:', error);
      toast({
        title: "Error",
        description: "Failed to add MCP server",
        variant: "destructive",
      });
    }
  };

  const handleConfigure = async (serverId: string) => {
    // TODO: Implement server configuration
    console.log('Configuring server:', serverId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-500';
      case 'disconnected':
        return 'text-red-500';
      default:
        return 'text-yellow-500';
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">MCP Configuration</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add MCP Server</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New MCP Server</DialogTitle>
              <DialogDescription>
                Enter the details for the new MCP server.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newServer.name}
                  onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  Type
                </Label>
                <Input
                  id="type"
                  value={newServer.type}
                  onChange={(e) => setNewServer({ ...newServer, type: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddServer}>Add Server</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {servers.map((server) => (
          <Card key={server.id}>
            <CardHeader>
              <CardTitle>{server.name}</CardTitle>
              <CardDescription>
                Status: <span className={getStatusColor(server.status)}>
                  {server.status === 'connecting' ? 'Connecting...' : server.status}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Type: {server.type}
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleConfigure(server.id)}
                disabled={server.status !== 'connected'}
              >
                {server.status === 'connected' ? 'Configure' : 'Connecting...'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}