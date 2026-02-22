'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { CircularProgress } from '@/components/ui/circular-progress';
import {
  Users,
  Clock,
  Loader,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/lib/api-client';
import type { UserLevelStatsResponse, UserDailyTaskRow } from '@/types';

interface UserLevelStatsCardProps {
  onError?: (msg: string) => void;
}

const STATUS_COLORS = {
  pending: { text: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/40' },
  in_progress: { text: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  completed: { text: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/40' },
  overdue: { text: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/40' },
};

function getCompletionColor(pct: number): string {
  if (pct >= 70) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40';
  if (pct >= 40) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/40';
  return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40';
}

function UserRow({ row }: { row: UserDailyTaskRow }) {
  const statBadges = [
    { label: 'Pending', count: row.pending_count, icon: Clock, ...STATUS_COLORS.pending },
    { label: 'In Progress', count: row.in_progress_count, icon: Loader, ...STATUS_COLORS.in_progress },
    { label: 'Completed', count: row.completed_count, icon: CheckCircle, ...STATUS_COLORS.completed },
    { label: 'Overdue', count: row.overdue_count, icon: AlertTriangle, ...STATUS_COLORS.overdue },
  ];

  return (
    <AccordionItem value={`user-${row.user_id}`} className="border rounded-lg px-3 mb-2">
      <AccordionTrigger className="py-2.5 hover:no-underline">
        <div className="flex items-center gap-3 w-full pr-2">
          <span className="text-sm font-medium truncate flex-1 text-left">
            {row.user_name}
          </span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getCompletionColor(
              row.completion_percentage,
            )}`}
          >
            {row.completion_percentage.toFixed(0)}%
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3 pb-1">
          {/* Today's tasks count */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Today&apos;s Tasks:</span>
            <span className="font-semibold">
              {row.today_completed}/{row.today_total} completed
            </span>
          </div>

          {/* Status badges */}
          <div className="grid grid-cols-4 gap-2">
            {statBadges.map((s) => (
              <div
                key={s.label}
                className={`flex flex-col items-center gap-0.5 rounded-lg py-2 px-1 ${s.bg}`}
              >
                <s.icon className={`h-3.5 w-3.5 ${s.text}`} />
                <span className={`text-sm font-bold leading-none ${s.text}`}>
                  {s.count}
                </span>
                <span className="text-[9px] text-muted-foreground leading-none">
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Pending tasks dropdown */}
          {row.pending_tasks.length > 0 && (
            <Accordion type="single" collapsible>
              <AccordionItem value="user-pending" className="border rounded px-2">
                <AccordionTrigger className="py-2 text-xs hover:no-underline">
                  <span className="flex items-center gap-1.5">
                    Pending Tasks
                    <span className="text-muted-foreground font-normal">
                      ({row.pending_tasks.length})
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ScrollArea className="max-h-37.5 overflow-auto">
                    <div className="space-y-1 pb-1">
                      {row.pending_tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between py-1 px-1.5 rounded text-xs hover:bg-muted/50"
                        >
                          <span
                            className={`truncate max-w-[55%] ${
                              task.status === 'overdue'
                                ? 'text-red-600 dark:text-red-400'
                                : ''
                            }`}
                          >
                            {task.title}
                          </span>
                          <span className="text-muted-foreground whitespace-nowrap ml-2">
                            {task.due_datetime
                              ? format(new Date(task.due_datetime), 'hh:mm a')
                              : 'No time'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function UserLevelStatsCard({ onError }: UserLevelStatsCardProps) {
  const [data, setData] = useState<UserLevelStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get<UserLevelStatsResponse>('/dashboard/user-stats');
        setData(res);
      } catch {
        // Silently fail for non-admins (403)
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [onError]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-around">
            <Skeleton className="h-30 w-30 rounded-full" />
            <Skeleton className="h-30 w-30 rounded-full" />
          </div>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Team Task Stats
          </CardTitle>
          <Badge variant="outline" className="text-xs gap-1">
            <ShieldCheck className="h-3 w-3" />
            Admin
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Circular progress — Today + Overall for all users */}
        <div className="flex items-center justify-around">
          <CircularProgress
            value={data.today_completed}
            total={data.today_total}
            progressColor="#22c55e"
            label="Today (All Users)"
            size={120}
          />
          <CircularProgress
            value={data.overall_completed}
            total={data.overall_total}
            progressColor="#3b82f6"
            label="Overall (All Users)"
            size={120}
          />
        </div>

        {/* Per-user collapsible rows */}
        {data.user_rows.length > 0 ? (
          <div>
            <p className="text-sm font-medium mb-2">Per-User Breakdown</p>
            <Accordion type="multiple">
              {data.user_rows.map((row) => (
                <UserRow key={row.user_id} row={row} />
              ))}
            </Accordion>
          </div>
        ) : (
          <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
            No users with tasks found
          </div>
        )}
      </CardContent>
    </Card>
  );
}
