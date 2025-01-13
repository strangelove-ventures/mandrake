import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function ProvidersPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">LLM Providers</h1>
        <Button>Add Provider</Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>OpenAI</CardTitle>
                <CardDescription>API Status: Active</CardDescription>
              </div>
              <Badge>Default</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              GPT-4 and GPT-3.5 Turbo models available for text generation and chat completion.
            </p>
            <Button variant="outline" size="sm">Manage Keys</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Anthropic</CardTitle>
            <CardDescription>API Status: Not Configured</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Claude and Claude Instant models for advanced language understanding.
            </p>
            <Button variant="outline" size="sm">Configure</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
