'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CircularProgress } from '@/components/ui/circular-progress';
import { ClipboardList, Clock, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/lib/api-client';
import type { MyTasksReport } from '@/types';

interface MyTasksReportCardProps {
  data?: MyTasksReport;  // Optional - if provided, skip fetch
  onError?: (msg: string) => void;
}

const STATUS_COLORS = {
  pending: { text: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/40' },
  in_progress: { text: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  completed: { text: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/40' },
  overdue: { text: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/40' },
};

export function MyTasksReportCard({ data: propData, onError }: MyTasksReportCardProps) {
  const [fetchedData, setFetchedData] = useState<MyTasksReport | null>(null);
  const [isLoading, setIsLoading] = useState(!propData);

  // Use prop data if provided, otherwise use fetched data
  const data = propData ?? fetchedData;

  useEffect(() => {
    // Skip fetch if data is provided via props
    if (propData) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const res = await api.get<MyTasksReport>('/dashboard/my-tasks');
        setFetchedData(res);
      } catch {
        onError?.('Failed to load your tasks report.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [propData, onError]);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-around">
            <Skeleton className="h-30 w-30 rounded-full" />
            <Skeleton className="h-30 w-30 rounded-full" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const statBadges = [
    { label: 'Pending', count: data.pending_count, icon: Clock, ...STATUS_COLORS.pending },
    { label: 'In Progress', count: data.in_progress_count, icon: Loader, ...STATUS_COLORS.in_progress },
    { label: 'Completed', count: data.completed_count, icon: CheckCircle, ...STATUS_COLORS.completed },
    { label: 'Overdue', count: data.overdue_count, icon: AlertTriangle, ...STATUS_COLORS.overdue },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          My Tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Circular progress bars */}
        <div className="flex items-center justify-around">
          <CircularProgress
            value={data.total_completed}
            total={data.total_active}
            progressColor="#3b82f6"
            label="Overall"
            size={120}
          />
          <CircularProgress
            value={data.today_completed}
            total={data.today_total}
            progressColor="#22c55e"
            label="Today"
            size={120}
          />
        </div>

        {/* Status badges */}
        <div className="grid grid-cols-4 gap-2">
          {statBadges.map((s) => (
            <div
              key={s.label}
              className={`flex flex-col items-center gap-1 rounded-lg py-2.5 px-1 ${s.bg}`}
            >
              <s.icon className={`h-4 w-4 ${s.text}`} />
              <span className={`text-lg font-bold leading-none ${s.text}`}>{s.count}</span>
              <span className="text-[10px] text-muted-foreground leading-none">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Collapsible pending tasks list */}
        {data.pending_tasks.length > 0 && (
          <Accordion type="single" collapsible>
            <AccordionItem value="pending-tasks" className="border rounded-lg px-3">
              <AccordionTrigger className="py-2.5 text-sm hover:no-underline">
                <span className="flex items-center gap-2">
                  Pending & In Progress Tasks
                  <span className="text-xs text-muted-foreground font-normal">
                    ({data.pending_tasks.length})
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ScrollArea className="max-h-50 overflow-auto">
                  <div className="space-y-1 pb-1">
                    {data.pending_tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between py-1.5 px-2 rounded text-sm hover:bg-muted/50"
                      >
                        <span
                          className={`truncate max-w-[60%] ${
                            task.status === 'overdue' ? 'text-red-600 dark:text-red-400' : ''
                          }`}
                        >
                          {task.title}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {task.due_datetime
                            ? format(new Date(task.due_datetime), 'MMM dd, hh:mm a')
                            : 'No due date'}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
