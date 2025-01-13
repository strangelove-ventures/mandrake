import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-24 text-center">
      <h1 className="text-4xl font-bold mb-6">Welcome to Mandrake</h1>
      <p className="text-xl mb-8 max-w-2xl">
        An advanced AI assistant platform integrating LangChain and MCP for powerful
        conversational AI experiences.
      </p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/workspaces">View Workspaces</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/mcp">Configure MCP</Link>
        </Button>
      </div>
    </div>
  )
}
