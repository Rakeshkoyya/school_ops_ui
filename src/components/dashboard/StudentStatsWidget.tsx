'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, GraduationCap } from 'lucide-react';
import type { StudentDashboardStats } from '@/types';

interface StudentStatsWidgetProps {
  data: StudentDashboardStats | null;
  isLoading?: boolean;
}

export function StudentStatsWidget({ data, isLoading }: StudentStatsWidgetProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          Student Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Students */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-600">Total Students</p>
              <p className="text-2xl font-bold text-blue-700">{data.total_students}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{data.class_count} classes</p>
          </div>
        </div>

        {/* Class Breakdown */}
        {data.by_class.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Students by Class</p>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {data.by_class.map((cls) => (
                <div
                  key={cls.class_section}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
                >
                  <span className="text-muted-foreground">{cls.class_section}</span>
                  <span className="font-medium">{cls.student_count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
