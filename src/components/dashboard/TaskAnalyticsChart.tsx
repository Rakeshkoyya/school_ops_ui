'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { TaskDashboardStats } from '@/types';

interface TaskAnalyticsChartProps {
  data: TaskDashboardStats | null;
  isLoading?: boolean;
}

const COLORS = {
  pending: '#eab308',      // yellow-500
  in_progress: '#3b82f6',  // blue-500
  done: '#22c55e',         // green-500
  overdue: '#ef4444',      // red-500
  cancelled: '#6b7280',    // gray-500
};

export function TaskAnalyticsChart({ data, isLoading }: TaskAnalyticsChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const chartData = [
    { name: 'Pending', value: data.status_counts.pending, color: COLORS.pending },
    { name: 'In Progress', value: data.status_counts.in_progress, color: COLORS.in_progress },
    { name: 'Done', value: data.status_counts.done, color: COLORS.done },
    { name: 'Overdue', value: data.status_counts.overdue, color: COLORS.overdue },
    { name: 'Cancelled', value: data.status_counts.cancelled, color: COLORS.cancelled },
  ].filter(item => item.value > 0);

  const hasData = chartData.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Task Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
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
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span className="text-sm text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[220px] text-muted-foreground">
            No tasks to display
          </div>
        )}
      </CardContent>
    </Card>
  );
}
