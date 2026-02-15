'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, TrendingUp, TrendingDown, Award } from 'lucide-react';
import type { ExamDashboardStats } from '@/types';

interface ExamStatsWidgetProps {
  data: ExamDashboardStats | null;
  isLoading?: boolean;
}

export function ExamStatsWidget({ data, isLoading }: ExamStatsWidgetProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.recent_exam_name) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Recent Exam Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            No exam data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const formattedDate = data.recent_exam_date
    ? new Date(data.recent_exam_date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Recent Exam Results
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Exam Info */}
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="font-semibold">{data.recent_exam_name}</p>
          <p className="text-sm text-muted-foreground">
            {data.recent_exam_subject} • {formattedDate}
          </p>
        </div>

        {/* Pass Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Pass Rate</span>
            <span className={`text-xl font-bold ${data.pass_rate >= 60 ? 'text-green-600' : 'text-red-600'}`}>
              {data.pass_rate}%
            </span>
          </div>
          <Progress 
            value={data.pass_rate} 
            className={`h-2 ${data.pass_rate >= 60 ? '' : '[&>div]:bg-red-500'}`}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-blue-50">
            <div className="flex items-center justify-center gap-1">
              <Award className="h-3 w-3 text-blue-600" />
              <span className="text-xs text-blue-600">Average</span>
            </div>
            <p className="text-lg font-semibold text-blue-700">
              {data.average_marks != null ? Number(data.average_marks).toFixed(1) : '-'}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-green-50">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-600">Highest</span>
            </div>
            <p className="text-lg font-semibold text-green-700">
              {data.highest_marks ?? '-'}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-orange-50">
            <div className="flex items-center justify-center gap-1">
              <TrendingDown className="h-3 w-3 text-orange-600" />
              <span className="text-xs text-orange-600">Lowest</span>
            </div>
            <p className="text-lg font-semibold text-orange-700">
              {data.lowest_marks ?? '-'}
            </p>
          </div>
        </div>

        {/* Students Count */}
        <div className="text-center text-sm text-muted-foreground pt-2 border-t">
          {data.total_students} students appeared
        </div>
      </CardContent>
    </Card>
  );
}
