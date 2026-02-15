'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Users, UserCheck, UserX, Clock, AlertCircle } from 'lucide-react';
import type { AttendanceDashboardStats, AttendanceByClassStat } from '@/types';

interface AttendanceSummaryWidgetProps {
  data: AttendanceDashboardStats | null;
  byClass?: AttendanceByClassStat[] | null;
  isLoading?: boolean;
}

export function AttendanceSummaryWidget({ data, byClass, isLoading }: AttendanceSummaryWidgetProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const formattedDate = new Date(data.date).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Today&apos;s Attendance</CardTitle>
          <span className="text-sm text-muted-foreground">{formattedDate}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Attendance Status */}
        {!data.attendance_captured ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">Attendance not captured</p>
              <p className="text-sm text-yellow-600">No attendance records for today</p>
            </div>
          </div>
        ) : (
          <>
            {/* Overall Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Present Rate</span>
                <span className="text-2xl font-bold text-green-600">{data.present_rate}%</span>
              </div>
              <Progress value={data.present_rate} className="h-2" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50">
                <UserCheck className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-lg font-semibold text-green-700">{data.present_count}</p>
                  <p className="text-xs text-green-600">Present</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50">
                <UserX className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-lg font-semibold text-red-700">{data.absent_count}</p>
                  <p className="text-xs text-red-600">Absent</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50">
                <Clock className="h-4 w-4 text-yellow-600" />
                <div>
                  <p className="text-lg font-semibold text-yellow-700">{data.late_count}</p>
                  <p className="text-xs text-yellow-600">Late</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50">
                <Users className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-lg font-semibold text-blue-700">{data.total_students}</p>
                  <p className="text-xs text-blue-600">Total</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Class-wise breakdown */}
        {byClass && byClass.length > 0 && data.attendance_captured && (
          <div className="pt-2 border-t">
            <p className="text-sm font-medium mb-2">By Class</p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {byClass.map((cls) => (
                <div key={cls.class_section} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{cls.class_section}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={cls.present_rate} className="w-20 h-1.5" />
                    <span className="w-12 text-right font-medium">{cls.present_rate}%</span>
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
