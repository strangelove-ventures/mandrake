import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function WorkspacesPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Workspaces</h1>
        <Button>Create Workspace</Button>
      </div>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Default Workspace</CardTitle>
            <CardDescription>Created on January 1, 2025</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The default workspace for testing and development. Includes base configuration
              for common LLM providers and MCP tools.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
