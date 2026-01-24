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
  GraduationCap,
  Download,
  AlertTriangle,
} from 'lucide-react';
import type { ExamRecord, ExamFilters, Upload as UploadType, PaginatedResponse } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Exam Upload Component
function ExamUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { project } = useProject();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setUploadStatus('uploading');
      setErrorMessage(null);
      const result = await api.upload<UploadType>(
        '/uploads/exams',
        formData,
        (progress) => setUploadProgress(progress)
      );
      return result;
    },
    onSuccess: () => {
      setUploadStatus('success');
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
      toast.success('Exam results uploaded successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      setUploadStatus('error');
      setErrorMessage(error.response?.data?.message || 'Upload failed. Invalid data in file.');
      toast.error('Failed to upload exam results');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
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
      setErrorMessage(null);
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
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Exam Results
        </CardTitle>
        <CardDescription>
          Upload an Excel file containing exam marks. All rows must be valid - any error will reject the entire upload.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Warning about full failure */}
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Important</AlertTitle>
            <AlertDescription className="text-amber-700">
              Exam uploads use strict validation. If any row contains invalid data, the entire upload will be rejected to ensure data integrity.
            </AlertDescription>
          </Alert>

          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
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
          {uploadStatus === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Upload Successful</AlertTitle>
              <AlertDescription className="text-green-700">
                All exam results have been uploaded and saved successfully.
              </AlertDescription>
            </Alert>
          )}

          {/* Error State */}
          {uploadStatus === 'error' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Upload Failed</AlertTitle>
              <AlertDescription>
                {errorMessage || 'The upload was rejected due to validation errors. Please check your file and try again.'}
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

// Exam Records Table
function ExamTable() {
  const [filters, setFilters] = useState<ExamFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const { project } = useProject();

  const { data, isLoading } = useQuery({
    queryKey: ['exams', project?.id, filters],
    queryFn: () =>
      api.get<PaginatedResponse<ExamRecord>>('/exams', filters),
    enabled: !!project?.id,
  });

  // Mock data for development
  const mockRecords: ExamRecord[] = [
    {
      id: '1',
      student_id: 'STU001',
      student_name: 'John Smith',
      class_name: 'Class 10',
      section: 'A',
      exam_name: 'Mid-Term 2026',
      subject: 'Mathematics',
      marks_obtained: 85,
      total_marks: 100,
      grade: 'A',
      project_id: '1',
      created_at: '2026-01-15',
    },
    {
      id: '2',
      student_id: 'STU002',
      student_name: 'Jane Doe',
      class_name: 'Class 10',
      section: 'A',
      exam_name: 'Mid-Term 2026',
      subject: 'Mathematics',
      marks_obtained: 92,
      total_marks: 100,
      grade: 'A+',
      project_id: '1',
      created_at: '2026-01-15',
    },
    {
      id: '3',
      student_id: 'STU001',
      student_name: 'John Smith',
      class_name: 'Class 10',
      section: 'A',
      exam_name: 'Mid-Term 2026',
      subject: 'Science',
      marks_obtained: 78,
      total_marks: 100,
      grade: 'B+',
      project_id: '1',
      created_at: '2026-01-15',
    },
    {
      id: '4',
      student_id: 'STU003',
      student_name: 'Bob Wilson',
      class_name: 'Class 10',
      section: 'B',
      exam_name: 'Mid-Term 2026',
      subject: 'English',
      marks_obtained: 65,
      total_marks: 100,
      grade: 'C+',
      project_id: '1',
      created_at: '2026-01-15',
    },
  ];

  const records = data?.items || mockRecords;

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-800';
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800';
    if (grade.startsWith('C')) return 'bg-amber-100 text-amber-800';
    if (grade.startsWith('D')) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Exam Records
            </CardTitle>
            <CardDescription>View and manage exam results</CardDescription>
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
            value={filters.exam_name || 'all'}
            onValueChange={(value) =>
              setFilters({ ...filters, exam_name: value === 'all' ? undefined : value })
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Exam" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exams</SelectItem>
              <SelectItem value="Mid-Term 2026">Mid-Term 2026</SelectItem>
              <SelectItem value="Final 2025">Final 2025</SelectItem>
              <SelectItem value="Unit Test 1">Unit Test 1</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.subject || 'all'}
            onValueChange={(value) =>
              setFilters({ ...filters, subject: value === 'all' ? undefined : value })
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              <SelectItem value="Mathematics">Mathematics</SelectItem>
              <SelectItem value="Science">Science</SelectItem>
              <SelectItem value="English">English</SelectItem>
              <SelectItem value="History">History</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.class_name || 'all'}
            onValueChange={(value) =>
              setFilters({ ...filters, class_name: value === 'all' ? undefined : value })
            }
          >
            <SelectTrigger className="w-[130px]">
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
                  <TableHead>Exam</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right">Marks</TableHead>
                  <TableHead>Grade</TableHead>
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
                      <TableCell>
                        {record.class_name} - {record.section}
                      </TableCell>
                      <TableCell>{record.exam_name}</TableCell>
                      <TableCell>{record.subject}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium">{record.marks_obtained}</span>
                        <span className="text-muted-foreground">/{record.total_marks}</span>
                      </TableCell>
                      <TableCell>
                        {record.grade && (
                          <Badge className={getGradeColor(record.grade)} variant="outline">
                            {record.grade}
                          </Badge>
                        )}
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

export default function ExamsPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exams</h1>
          <p className="text-muted-foreground mt-1">
            Upload and manage exam results
          </p>
        </div>

        <Tabs defaultValue="view" className="space-y-4">
          <TabsList>
            <PermissionGuard permission="exam:view">
              <TabsTrigger value="view">View Results</TabsTrigger>
            </PermissionGuard>
            <PermissionGuard permission="exam:upload">
              <TabsTrigger value="upload">Upload</TabsTrigger>
            </PermissionGuard>
          </TabsList>

          <PermissionGuard permission="exam:view">
            <TabsContent value="view">
              <ExamTable />
            </TabsContent>
          </PermissionGuard>

          <PermissionGuard permission="exam:upload">
            <TabsContent value="upload">
              <ExamUploader />
            </TabsContent>
          </PermissionGuard>
        </Tabs>
      </div>
    </MainLayout>
  );
}
