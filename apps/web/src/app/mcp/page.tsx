import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function MCPConfigPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">MCP Configuration</h1>
        <Button>Add MCP Server</Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>File System Server</CardTitle>
            <CardDescription>Status: Connected</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Local filesystem access for document processing and management.
            </p>
            <Button variant="outline" size="sm">Configure</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weather Server</CardTitle>
            <CardDescription>Status: Not Connected</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Real-time weather data access for location-based queries.
            </p>
            <Button variant="outline" size="sm">Connect</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
