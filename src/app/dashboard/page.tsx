'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useProject } from '@/contexts/project-context';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LayoutDashboard, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import {
  AttendanceSummaryWidget,
  ExamStatsWidget,
  StudentStatsWidget,
  MyTasksReportCard,
  ProjectTaskStatsCard,
  UserLevelStatsCard,
} from '@/components/dashboard';
import type { DashboardResponse } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const { project, isProjectAdmin } = useProject();
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchDashboard = useCallback(async () => {
    if (!project?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.get<DashboardResponse>('/dashboard');
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [project?.id]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleRefresh = () => {
    fetchDashboard();
    setRefreshKey((k) => k + 1);
  };

  const config = dashboardData?.widget_config;
  const showTasks = config?.show_tasks ?? false;
  const showNonTaskWidgets =
    config &&
    (config.show_attendance || config.show_exams || config.show_students);
  const hasAnyWidget =
    showTasks || showNonTaskWidgets;
  const isAdmin = isProjectAdmin || user?.is_super_admin;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-muted-foreground mt-1">
              {project?.name ? `Managing ${project.name}` : 'Your dashboard overview'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-700">{error}</p>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="ml-auto">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading State (only for the legacy dashboard call) */}
        {isLoading && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2"><Skeleton className="h-5 w-28" /></CardHeader>
                <CardContent><Skeleton className="h-75 w-full" /></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><Skeleton className="h-5 w-36" /></CardHeader>
                <CardContent><Skeleton className="h-75 w-full" /></CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* No Widgets Available */}
        {!isLoading && !error && !hasAnyWidget && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md text-center">
              <CardHeader className="pb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <LayoutDashboard className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">No Dashboard Widgets</CardTitle>
                <CardDescription className="text-base">
                  No features are enabled for this project or you don&apos;t have permission to view them.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Contact your administrator to enable features for this project.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Dashboard Widgets */}
        {!isLoading && !error && hasAnyWidget && (
          <div className="space-y-6">
            {/* ===== Task Management Sections ===== */}
            {showTasks && (
              <>
                {/* Row 1: My Tasks (left) + Project Overview (right) */}
                <div className="grid gap-6 lg:grid-cols-2">
                  <MyTasksReportCard key={`my-tasks-${refreshKey}`} />
                  <ProjectTaskStatsCard key={`proj-stats-${refreshKey}`} />
                </div>

                {/* Row 2: Team Stats (admin only, full width) */}
                {isAdmin && (
                  <UserLevelStatsCard key={`user-stats-${refreshKey}`} />
                )}
              </>
            )}

            {/* ===== Non-Task Widgets ===== */}
            {showNonTaskWidgets && dashboardData && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {config?.show_attendance && dashboardData.attendance && (
                  <AttendanceSummaryWidget
                    data={dashboardData.attendance}
                    byClass={dashboardData.attendance_by_class}
                  />
                )}

                {config?.show_exams && (
                  <ExamStatsWidget data={dashboardData.exams} />
                )}

                {config?.show_students && dashboardData.students && (
                  <StudentStatsWidget data={dashboardData.students} />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
