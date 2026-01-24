'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ArrowLeft,
  Download,
  FileUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Calendar,
  User,
} from 'lucide-react';
import type { Upload, UploadError, UploadStatus } from '@/types';
import { format } from 'date-fns';

const statusConfig: Record<UploadStatus, { label: string; icon: React.ElementType; className: string }> = {
  pending: { label: 'Pending', icon: Clock, className: 'bg-gray-100 text-gray-700' },
  processing: { label: 'Processing', icon: Clock, className: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', icon: CheckCircle2, className: 'bg-green-100 text-green-700' },
  partial: { label: 'Partial Success', icon: AlertCircle, className: 'bg-amber-100 text-amber-700' },
  failed: { label: 'Failed', icon: XCircle, className: 'bg-red-100 text-red-700' },
};

export default function UploadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const uploadId = params.id as string;

  const { data: upload, isLoading: uploadLoading } = useQuery({
    queryKey: ['upload', uploadId],
    queryFn: () => api.get<Upload>(`/uploads/${uploadId}`),
    enabled: !!uploadId,
  });

  // Mock data for development
  const mockUpload: Upload = {
    id: uploadId,
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
    errors: [
      {
        id: '1',
        upload_id: uploadId,
        row_number: 45,
        error_type: 'validation',
        error_message: 'Invalid student ID: STU999 not found in database',
      },
      {
        id: '2',
        upload_id: uploadId,
        row_number: 78,
        error_type: 'validation',
        error_message: 'Invalid date format: Expected YYYY-MM-DD',
      },
      {
        id: '3',
        upload_id: uploadId,
        row_number: 112,
        error_type: 'validation',
        error_message: 'Invalid status value: "here" is not a valid status',
      },
      {
        id: '4',
        upload_id: uploadId,
        row_number: 156,
        error_type: 'duplicate',
        error_message: 'Duplicate entry: Attendance already recorded for this student on this date',
      },
      {
        id: '5',
        upload_id: uploadId,
        row_number: 198,
        error_type: 'validation',
        error_message: 'Missing required field: student_id cannot be empty',
      },
    ],
  };

  const displayUpload = upload || mockUpload;
  const displayErrors = displayUpload.errors || [];
  const status = statusConfig[displayUpload.status];
  const StatusIcon = status.icon;

  const handleDownloadErrors = () => {
    // Create CSV content
    const headers = ['Row Number', 'Error Type', 'Error Message', 'Column', 'Raw Value'];
    const csvContent = [
      headers.join(','),
      ...displayErrors.map((error) =>
        [
          error.row_number,
          `"${error.error_type}"`,
          `"${error.error_message}"`,
          `"${error.column_name || ''}"`,
          `"${(error.raw_value || '').replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `upload_errors_${uploadId}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (uploadLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Upload Details</h1>
            <p className="text-muted-foreground mt-1">
              View upload information and error details
            </p>
          </div>
        </div>

        {/* Upload Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <FileUp className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>{displayUpload.file_name}</CardTitle>
                  <CardDescription>{formatFileSize(displayUpload.file_size)}</CardDescription>
                </div>
              </div>
              <Badge className={status.className}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Rows</p>
                <p className="text-2xl font-bold">{displayUpload.total_rows}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Successful</p>
                <p className="text-2xl font-bold text-green-600">{displayUpload.successful_rows}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">{displayUpload.failed_rows}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">
                  {displayUpload.total_rows > 0
                    ? Math.round((displayUpload.successful_rows / displayUpload.total_rows) * 100)
                    : 0}
                  %
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Uploaded by:</span>
                <span className="font-medium">{displayUpload.uploaded_by_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">
                  {format(new Date(displayUpload.created_at), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
              {displayUpload.processing_completed_at && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Completed:</span>
                  <span className="font-medium">
                    {format(new Date(displayUpload.processing_completed_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Errors Section */}
        {displayUpload.failed_rows > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" />
                    Error Details
                  </CardTitle>
                  <CardDescription>
                    {displayErrors.length} rows failed validation
                  </CardDescription>
                </div>
                <Button onClick={handleDownloadErrors}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Error Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {errorsLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Row #</TableHead>
                        <TableHead>Error Message</TableHead>
                        <TableHead>Row Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayErrors.map((error) => (
                        <TableRow key={error.id}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {error.row_number}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Alert variant="destructive" className="p-2 border-0 bg-transparent">
                              <AlertDescription className="text-sm">
                                {error.error_message}
                              </AlertDescription>
                            </Alert>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted p-2 rounded block max-w-md overflow-x-auto">
                              {JSON.stringify(error.row_data, null, 2)}
                            </code>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Success message if no errors */}
        {displayUpload.status === 'completed' && displayUpload.failed_rows === 0 && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">All rows processed successfully</AlertTitle>
            <AlertDescription className="text-green-700">
              This upload completed without any errors. All {displayUpload.total_rows} rows were
              processed and saved.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </MainLayout>
  );
}
