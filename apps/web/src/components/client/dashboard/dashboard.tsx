'use client';

import { AppShell } from "@/components/client/layouts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Dashboard() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to Mandrake, your extensible AI agent platform.
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            title="Workspaces"
            description="Manage your project workspaces"
            href="/workspaces"
          />
          <DashboardCard
            title="Sessions"
            description="View your system-level conversation sessions"
            href="/sessions"
          />
          <DashboardCard
            title="Tools"
            description="Configure and manage available tools"
            href="/tools"
          />
          <DashboardCard
            title="Models"
            description="Manage AI model configurations"
            href="/models"
          />
          <DashboardCard
            title="Prompt"
            description="Configure system prompt templates"
            href="/prompt"
          />
          <DashboardCard
            title="Dynamic Context"
            description="Manage dynamic context providers"
            href="/dynamic"
          />
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Get Started</h2>
          <div className="flex gap-4">
            <Button asChild>
              <Link href="/workspaces/new">Create New Workspace</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/sessions/new">Start New Session</Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

interface DashboardCardProps {
  title: string;
  description: string;
  href: string;
}

function DashboardCard({ title, description, href }: DashboardCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" className="w-full">
          <Link href={href}>View {title}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
