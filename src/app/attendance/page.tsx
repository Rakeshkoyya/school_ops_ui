'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout';
import { PermissionGuard } from '@/components/guards';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Calendar,
  Download,
} from 'lucide-react';
import type { AttendanceRecord, AttendanceFilters, Upload as UploadType, PaginatedResponse } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Upload Component
function AttendanceUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadResult, setUploadResult] = useState<UploadType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { project } = useProject();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setUploadStatus('uploading');
      const result = await api.upload<UploadType>(
        '/uploads/attendance',
        formData,
        (progress) => setUploadProgress(progress)
      );
      return result;
    },
    onSuccess: (data) => {
      setUploadStatus('success');
      setUploadResult(data);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
      toast.success('Attendance data uploaded successfully');
    },
    onError: (error) => {
      setUploadStatus('error');
      toast.error('Failed to upload attendance data');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      if (!validTypes.includes(selectedFile.type)) {
        toast.error('Please upload an Excel file (.xlsx or .xls)');
        return;
      }
      setFile(selectedFile);
      setUploadStatus('idle');
      setUploadProgress(0);
      setUploadResult(null);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    uploadMutation.mutate(formData);
  };

  const handleReset = () => {
    setFile(null);
    setUploadProgress(0);
    setUploadStatus('idle');
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Attendance
        </CardTitle>
        <CardDescription>
          Upload an Excel file containing attendance data. Ensure the file follows the required format.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              file ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            {file ? (
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="font-medium">Click to upload or drag and drop</p>
                <p className="text-sm text-muted-foreground">Excel files only (.xlsx, .xls)</p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {uploadStatus === 'uploading' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Success State */}
          {uploadStatus === 'success' && uploadResult && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Upload Successful</AlertTitle>
              <AlertDescription className="text-green-700">
                <div className="mt-2 space-y-1">
                  <p>Total rows: {uploadResult.total_rows}</p>
                  <p>Successful: {uploadResult.successful_rows}</p>
                  {uploadResult.failed_rows > 0 && (
                    <p className="text-amber-600">
                      Failed: {uploadResult.failed_rows} (
                      <a href={`/uploads/${uploadResult.id}`} className="underline">
                        View errors
                      </a>
                      )
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error State */}
          {uploadStatus === 'error' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Upload Failed</AlertTitle>
              <AlertDescription>
                There was an error uploading your file. Please try again.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleUpload} disabled={!file || uploadStatus === 'uploading'}>
              {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload'}
            </Button>
            {file && (
              <Button variant="outline" onClick={handleReset}>
                Clear
              </Button>
            )}
            <Button variant="ghost" className="ml-auto">
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Attendance Records Table
function AttendanceTable() {
  const [filters, setFilters] = useState<AttendanceFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const { project } = useProject();

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', project?.id, filters],
    queryFn: () =>
      api.get<PaginatedResponse<AttendanceRecord>>('/attendance', filters),
    enabled: !!project?.id,
  });

  // Mock data for development
  const mockRecords: AttendanceRecord[] = [
    {
      id: '1',
      student_id: 'STU001',
      student_name: 'John Smith',
      class_name: 'Class 10',
      section: 'A',
      date: '2026-01-18',
      status: 'present',
      project_id: '1',
      created_at: '2026-01-18',
    },
    {
      id: '2',
      student_id: 'STU002',
      student_name: 'Jane Doe',
      class_name: 'Class 10',
      section: 'A',
      date: '2026-01-18',
      status: 'absent',
      remarks: 'Medical leave',
      project_id: '1',
      created_at: '2026-01-18',
    },
    {
      id: '3',
      student_id: 'STU003',
      student_name: 'Bob Wilson',
      class_name: 'Class 10',
      section: 'B',
      date: '2026-01-18',
      status: 'late',
      remarks: 'Arrived 15 mins late',
      project_id: '1',
      created_at: '2026-01-18',
    },
    {
      id: '4',
      student_id: 'STU004',
      student_name: 'Alice Brown',
      class_name: 'Class 9',
      section: 'A',
      date: '2026-01-18',
      status: 'excused',
      remarks: 'School event',
      project_id: '1',
      created_at: '2026-01-18',
    },
  ];

  const records = data?.items || mockRecords;

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    present: { label: 'Present', variant: 'default' },
    absent: { label: 'Absent', variant: 'destructive' },
    late: { label: 'Late', variant: 'secondary' },
    excused: { label: 'Excused', variant: 'outline' },
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Attendance Records</CardTitle>
            <CardDescription>View and manage attendance data</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filters.class_name || 'all'}
            onValueChange={(value) =>
              setFilters({ ...filters, class_name: value === 'all' ? undefined : value })
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              <SelectItem value="Class 9">Class 9</SelectItem>
              <SelectItem value="Class 10">Class 10</SelectItem>
              <SelectItem value="Class 11">Class 11</SelectItem>
              <SelectItem value="Class 12">Class 12</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.section || 'all'}
            onValueChange={(value) =>
              setFilters({ ...filters, section: value === 'all' ? undefined : value })
            }
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              <SelectItem value="A">Section A</SelectItem>
              <SelectItem value="B">Section B</SelectItem>
              <SelectItem value="C">Section C</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filters.date || ''}
            onChange={(e) => setFilters({ ...filters, date: e.target.value || undefined })}
            className="w-[150px]"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records
                  .filter(
                    (r) =>
                      r.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      r.student_id.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.student_id}</TableCell>
                      <TableCell>{record.student_name}</TableCell>
                      <TableCell>{record.class_name}</TableCell>
                      <TableCell>{record.section}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(record.date), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[record.status]?.variant || 'outline'}>
                          {statusConfig[record.status]?.label || record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {record.remarks || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AttendancePage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground mt-1">
            Upload and manage student attendance records
          </p>
        </div>

        <Tabs defaultValue="view" className="space-y-4">
          <TabsList>
            <PermissionGuard permission="attendance:view">
              <TabsTrigger value="view">View Records</TabsTrigger>
            </PermissionGuard>
            <PermissionGuard permission="attendance:upload">
              <TabsTrigger value="upload">Upload</TabsTrigger>
            </PermissionGuard>
          </TabsList>

          <PermissionGuard permission="attendance:view">
            <TabsContent value="view">
              <AttendanceTable />
            </TabsContent>
          </PermissionGuard>

          <PermissionGuard permission="attendance:upload">
            <TabsContent value="upload">
              <AttendanceUploader />
            </TabsContent>
          </PermissionGuard>
        </Tabs>
      </div>
    </MainLayout>
  );
}
