'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { api } from '@/lib/api-client';
import { useProject } from '@/contexts/project-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  FileUp,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  Download,
  Filter,
} from 'lucide-react';
import type { Upload, UploadStatus, UploadType, PaginatedResponse } from '@/types';
import { format } from 'date-fns';

const statusConfig: Record<UploadStatus, { label: string; icon: React.ElementType; className: string }> = {
  pending: { label: 'Pending', icon: Clock, className: 'bg-gray-100 text-gray-700 border-gray-200' },
  processing: { label: 'Processing', icon: Clock, className: 'bg-blue-100 text-blue-700 border-blue-200' },
  completed: { label: 'Completed', icon: CheckCircle2, className: 'bg-green-100 text-green-700 border-green-200' },
  partial: { label: 'Partial', icon: AlertCircle, className: 'bg-amber-100 text-amber-700 border-amber-200' },
  failed: { label: 'Failed', icon: XCircle, className: 'bg-red-100 text-red-700 border-red-200' },
};

const typeLabels: Record<UploadType, string> = {
  attendance: 'Attendance',
  exam: 'Exam Results',
  student: 'Student Data',
  other: 'Other',
};

export default function UploadsPage() {
  const { project } = useProject();

  const { data, isLoading } = useQuery({
    queryKey: ['uploads', project?.id],
    queryFn: () => api.get<PaginatedResponse<Upload>>('/uploads'),
    enabled: !!project?.id,
  });

  // Mock data for development
  const mockUploads: Upload[] = [
    {
      id: '1',
      file_name: 'attendance_jan_week3.xlsx',
      file_size: 45678,
      upload_type: 'attendance',
      status: 'completed',
      total_rows: 250,
      successful_rows: 250,
      failed_rows: 0,
      uploaded_by_id: '1',
      uploaded_by_name: 'John Admin',
      project_id: '1',
      created_at: '2026-01-18T10:30:00Z',
      updated_at: '2026-01-18T10:31:00Z',
      processing_completed_at: '2026-01-18T10:31:00Z',
    },
    {
      id: '2',
      file_name: 'exam_results_class10_midterm.xlsx',
      file_size: 128456,
      upload_type: 'exam',
      status: 'failed',
      total_rows: 180,
      successful_rows: 0,
      failed_rows: 180,
      uploaded_by_id: '2',
      uploaded_by_name: 'Sarah Teacher',
      project_id: '1',
      created_at: '2026-01-17T14:20:00Z',
      updated_at: '2026-01-17T14:20:00Z',
    },
    {
      id: '3',
      file_name: 'attendance_jan_week2.xlsx',
      file_size: 52340,
      upload_type: 'attendance',
      status: 'partial',
      total_rows: 280,
      successful_rows: 265,
      failed_rows: 15,
      uploaded_by_id: '1',
      uploaded_by_name: 'John Admin',
      project_id: '1',
      created_at: '2026-01-15T09:15:00Z',
      updated_at: '2026-01-15T09:16:00Z',
      processing_completed_at: '2026-01-15T09:16:00Z',
    },
    {
      id: '4',
      file_name: 'student_data_update.xlsx',
      file_size: 89234,
      upload_type: 'student',
      status: 'processing',
      total_rows: 500,
      successful_rows: 0,
      failed_rows: 0,
      uploaded_by_id: '3',
      uploaded_by_name: 'Mike Staff',
      project_id: '1',
      created_at: '2026-01-18T11:00:00Z',
      updated_at: '2026-01-18T11:00:00Z',
    },
    {
      id: '5',
      file_name: 'exam_results_class9_unit1.xlsx',
      file_size: 67890,
      upload_type: 'exam',
      status: 'completed',
      total_rows: 150,
      successful_rows: 150,
      failed_rows: 0,
      uploaded_by_id: '2',
      uploaded_by_name: 'Sarah Teacher',
      project_id: '1',
      created_at: '2026-01-14T16:45:00Z',
      updated_at: '2026-01-14T16:46:00Z',
      processing_completed_at: '2026-01-14T16:46:00Z',
    },
  ];

  const uploads = data?.items || mockUploads;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upload History</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all file uploads
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <FileUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{uploads.length}</p>
                  <p className="text-sm text-muted-foreground">Total Uploads</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {uploads.filter((u) => u.status === 'completed').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-amber-100">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {uploads.filter((u) => u.status === 'partial').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Partial</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-red-100">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {uploads.filter((u) => u.status === 'failed').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Uploads Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>All Uploads</CardTitle>
                <CardDescription>View upload history and error details</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-[250px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search uploads..." className="pl-9" />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>Uploaded By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploads.map((upload) => {
                      const status = statusConfig[upload.status];
                      const StatusIcon = status.icon;

                      return (
                        <TableRow key={upload.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileUp className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{upload.file_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(upload.file_size)}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{typeLabels[upload.upload_type]}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={status.className} variant="outline">
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <span className="text-green-600">{upload.successful_rows}</span>
                              <span className="text-muted-foreground"> / {upload.total_rows}</span>
                              {upload.failed_rows > 0 && (
                                <span className="text-red-600 ml-1">
                                  ({upload.failed_rows} failed)
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{upload.uploaded_by_name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(upload.created_at), 'MMM d, yyyy')}
                              <br />
                              <span className="text-muted-foreground">
                                {format(new Date(upload.created_at), 'h:mm a')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/uploads/${upload.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              {upload.error_file_url && (
                                <Button variant="ghost" size="icon">
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
