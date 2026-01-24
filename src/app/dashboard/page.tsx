'use client';

import { useAuth } from '@/contexts/auth-context';
import { useProject } from '@/contexts/project-context';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, Clock } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const { project } = useProject();

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {project?.name ? `Managing ${project.name}` : 'Your dashboard overview'}
          </p>
        </div>

        {/* Coming Soon Content */}
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md text-center">
            <CardHeader className="pb-4">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Coming Soon</CardTitle>
              <CardDescription className="text-base">
                We&apos;re working on something amazing!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The dashboard with statistics, charts, and insights will be available soon.
                In the meantime, use the sidebar to navigate to different sections.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard features in development</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
