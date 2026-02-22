'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import {
  BarChart3,
  Clock,
  Loader,
  AlertTriangle,
  CheckCircle,
  Zap,
  Trophy,
  Medal,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import type { ProjectTaskStatsResponse } from '@/types';

interface ProjectTaskStatsCardProps {
  onError?: (msg: string) => void;
}

const PIE_COLORS: Record<string, string> = {
  pending: '#eab308',
  in_progress: '#3b82f6',
  done: '#22c55e',
  overdue: '#ef4444',
  cancelled: '#6b7280',
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="h-4 w-4 text-yellow-500" />;
    case 2:
      return <Medal className="h-4 w-4 text-gray-400" />;
    case 3:
      return <Medal className="h-4 w-4 text-amber-600" />;
    default:
      return (
        <span className="w-4 text-center text-sm font-medium text-muted-foreground">
          {rank}
        </span>
      );
  }
};

const getRankBg = (rank: number) => {
  switch (rank) {
    case 1:
      return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    case 2:
      return 'bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700';
    case 3:
      return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
    default:
      return 'bg-muted/30';
  }
};

export function ProjectTaskStatsCard({ onError }: ProjectTaskStatsCardProps) {
  const [data, setData] = useState<ProjectTaskStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get<ProjectTaskStatsResponse>(
          '/dashboard/project-stats',
        );
        setData(res);
      } catch {
        onError?.('Failed to load project stats.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [onError]);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-45 w-full rounded-lg" />
          <Skeleton className="h-35 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const stats = [
    {
      label: 'Pending',
      count: data.pending_count,
      icon: Clock,
      text: 'text-yellow-700 dark:text-yellow-400',
      bg: 'bg-yellow-100 dark:bg-yellow-900/40',
    },
    {
      label: 'In Progress',
      count: data.in_progress_count,
      icon: Loader,
      text: 'text-blue-700 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/40',
    },
    {
      label: 'Overdue',
      count: data.overdue_count,
      icon: AlertTriangle,
      text: 'text-red-700 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/40',
    },
    {
      label: 'Completed',
      count: data.completed_count,
      icon: CheckCircle,
      text: 'text-green-700 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/40',
    },
  ];

  const chartData = [
    { name: 'Pending', value: data.status_distribution.pending, color: PIE_COLORS.pending },
    { name: 'In Progress', value: data.status_distribution.in_progress, color: PIE_COLORS.in_progress },
    { name: 'Done', value: data.status_distribution.done, color: PIE_COLORS.done },
    { name: 'Overdue', value: data.status_distribution.overdue, color: PIE_COLORS.overdue },
    { name: 'Cancelled', value: data.status_distribution.cancelled, color: PIE_COLORS.cancelled },
  ].filter((item) => item.value > 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Project Overview
          </CardTitle>
          <Badge variant="secondary" className="font-mono text-xs">
            {data.active_tasks}/{data.total_tasks} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Compact stat grid */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className={`flex flex-col items-center gap-1 rounded-lg py-2.5 px-1 ${s.bg}`}
            >
              <s.icon className={`h-4 w-4 ${s.text}`} />
              <span className={`text-lg font-bold leading-none ${s.text}`}>
                {s.count}
              </span>
              <span className="text-[10px] text-muted-foreground leading-none">
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Status distribution chart */}
        {chartData.length > 0 ? (
          <div>
            <p className="text-sm font-medium mb-2">Task Status Distribution</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [value, 'Tasks']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={28}
                  formatter={(value) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-45 text-sm text-muted-foreground">
            No tasks to display
          </div>
        )}

        {/* Evo Points Leaderboard */}
        {data.evo_leaderboard.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-yellow-500" />
              Evo Points Leaderboard
            </p>
            <div className="space-y-1.5">
              {data.evo_leaderboard.map((entry) => (
                <div
                  key={entry.user_id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border ${getRankBg(
                    entry.rank,
                  )}`}
                >
                  <div className="flex items-center gap-2.5">
                    {getRankIcon(entry.rank)}
                    <span className="text-sm font-medium truncate max-w-30">
                      {entry.user_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-semibold">
                    <Zap className="h-3 w-3 text-yellow-500" />
                    {entry.points}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
