'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout';
import { PermissionGuard } from '@/components/guards';
import { api, getAccessToken, getCurrentProjectId } from '@/lib/api-client';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Calendar,
  Download,
  Users,
  Edit2,
  Save,
  ClipboardList,
  RefreshCw,
} from 'lucide-react';
import type {
  AttendanceRecord,
  AttendanceFilters,
  AttendanceByClassResponse,
  BulkAttendanceCreate,
  BulkAttendanceResponse,
  AttendanceUploadResult,
  ClassSection,
  AttendanceStatus,
  PaginatedResponse,
  StudentAttendanceEntry,
} from '@/types';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

// Status configuration
const STATUS_CONFIG: Record<AttendanceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; shortLabel: string; color: string }> = {
  present: { label: 'Present', variant: 'default', shortLabel: 'P', color: 'bg-green-500' },
  absent: { label: 'Absent', variant: 'destructive', shortLabel: 'A', color: 'bg-red-500' },
  late: { label: 'Late', variant: 'secondary', shortLabel: 'L', color: 'bg-yellow-500' },
  excused: { label: 'Excused', variant: 'outline', shortLabel: 'E', color: 'bg-blue-500' },
};

// ==========================================
// Manual Attendance Entry Component
// ==========================================
function ManualAttendanceEntry() {
  const { project } = useProject();
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [studentAttendance, setStudentAttendance] = useState<Map<number, AttendanceStatus>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch class sections
  const { data: classSections, isLoading: loadingClasses } = useQuery({
    queryKey: ['class-sections', project?.id],
    queryFn: () => api.get<ClassSection[]>('/attendance/class-sections'),
    enabled: !!project?.id,
  });

  // Fetch attendance for selected class and date
  const { data: classAttendance, isLoading: loadingAttendance, refetch: refetchAttendance } = useQuery({
    queryKey: ['attendance-by-class', project?.id, selectedClass, selectedDate],
    queryFn: () =>
      api.get<AttendanceByClassResponse>('/attendance/by-class', {
        class_section: selectedClass,
        attendance_date: selectedDate,
      }),
    enabled: !!project?.id && !!selectedClass && !!selectedDate,
  });

  // Initialize student attendance when data loads
  useEffect(() => {
    if (classAttendance?.students) {
      const map = new Map<number, AttendanceStatus>();
      classAttendance.students.forEach((student) => {
        map.set(student.student_id, student.status || 'present');
      });
      setStudentAttendance(map);
      setHasChanges(false);
    }
  }, [classAttendance]);

  // Bulk save mutation
  const saveMutation = useMutation({
    mutationFn: (data: BulkAttendanceCreate) =>
      api.post<BulkAttendanceResponse>('/attendance/bulk', data),
    onSuccess: (result) => {
      if (result.failed === 0) {
        toast.success(result.message);
      } else {
        toast.warning(`${result.successful} saved, ${result.failed} failed`);
      }
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      refetchAttendance();
    },
    onError: () => {
      toast.error('Failed to save attendance');
    },
  });

  const handleStatusChange = (studentId: number, status: AttendanceStatus) => {
    setStudentAttendance((prev) => {
      const newMap = new Map(prev);
      newMap.set(studentId, status);
      return newMap;
    });
    setHasChanges(true);
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    setStudentAttendance((prev) => {
      const newMap = new Map(prev);
      classAttendance?.students.forEach((student) => {
        newMap.set(student.student_id, status);
      });
      return newMap;
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!selectedClass || !selectedDate) return;

    const records = Array.from(studentAttendance.entries()).map(([student_id, status]) => ({
      student_id,
      status,
    }));

    saveMutation.mutate({
      attendance_date: selectedDate,
      class_section: selectedClass,
      records,
    });
  };

  // Calculate summary
  const summary = useMemo(() => {
    let present = 0, absent = 0;
    studentAttendance.forEach((status) => {
      if (status === 'present') present++;
      else if (status === 'absent') absent++;
    });
    return { present, absent, total: studentAttendance.size };
  }, [studentAttendance]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Manual Attendance Entry
        </CardTitle>
        <CardDescription>
          Select a class and date to mark attendance for all students
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selection Controls */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium">Class-Section</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classSections?.map((cs) => (
                  <SelectItem key={cs.class_section} value={cs.class_section}>
                    {cs.class_section} ({cs.student_count} students)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-[180px]"
            />
          </div>
          {selectedClass && (
            <Button
              variant="outline"
              onClick={() => refetchAttendance()}
              disabled={loadingAttendance}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingAttendance ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>

        {/* Quick Actions */}
        {classAttendance && classAttendance.students.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium mr-2">Mark All:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMarkAll('present')}
            >
              Present
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMarkAll('absent')}
            >
              Absent
            </Button>
          </div>
        )}

        {/* Summary Stats */}
        {classAttendance && classAttendance.students.length > 0 && (
          <div className="grid grid-cols-3 gap-4 max-w-md">
            <div className="bg-muted rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{summary.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{summary.present}</div>
              <div className="text-xs text-muted-foreground">Present</div>
            </div>
            <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{summary.absent}</div>
              <div className="text-xs text-muted-foreground">Absent</div>
            </div>
          </div>
        )}

        {/* Students Table */}
        {loadingAttendance ? (
          <Skeleton className="h-[400px] w-full" />
        ) : !selectedClass ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a class to view students</p>
          </div>
        ) : classAttendance && classAttendance.students.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="w-[140px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classAttendance.students.map((student, index) => {
                  const status = studentAttendance.get(student.student_id);
                  return (
                    <TableRow key={student.student_id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{student.student_name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant={status === 'present' ? 'default' : 'outline'}
                            size="sm"
                            className={`w-14 h-8 ${status === 'present' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                            onClick={() => handleStatusChange(student.student_id, 'present')}
                          >
                            P
                          </Button>
                          <Button
                            variant={status === 'absent' ? 'default' : 'outline'}
                            size="sm"
                            className={`w-14 h-8 ${status === 'absent' ? 'bg-red-500 hover:bg-red-600' : ''}`}
                            onClick={() => handleStatusChange(student.student_id, 'absent')}
                          >
                            A
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No students found in this class</p>
          </div>
        )}

        {/* Save Button */}
        {classAttendance && classAttendance.students.length > 0 && (
          <div className="flex justify-end gap-2">
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="min-w-[120px]"
            >
              {saveMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Attendance
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==========================================
// Excel Upload Component
// ==========================================
function AttendanceUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadResult, setUploadResult] = useState<AttendanceUploadResult | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { project } = useProject();
  const queryClient = useQueryClient();

  // Template download state
  const [selectedTemplateClass, setSelectedTemplateClass] = useState<string>('');
  const [templateMonth, setTemplateMonth] = useState<number>(new Date().getMonth() + 1);
  const [templateYear, setTemplateYear] = useState<number>(new Date().getFullYear());

  // Fetch class sections for template
  const { data: classSections } = useQuery({
    queryKey: ['class-sections', project?.id],
    queryFn: () => api.get<ClassSection[]>('/attendance/class-sections'),
    enabled: !!project?.id,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setUploadStatus('uploading');
      const result = await api.upload<AttendanceUploadResult>(
        '/attendance/upload',
        formData,
        (progress) => setUploadProgress(progress)
      );
      return result;
    },
    onSuccess: (data) => {
      setUploadStatus(data.failed_rows > 0 ? 'error' : 'success');
      setUploadResult(data);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      if (data.failed_rows === 0) {
        toast.success(data.message);
      } else {
        toast.warning(data.message);
      }
    },
    onError: () => {
      setUploadStatus('error');
      toast.error('Failed to upload attendance data');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.xlsx')) {
        toast.error('Please upload an Excel file (.xlsx)');
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

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloading(true);
      const params = new URLSearchParams();
      if (selectedTemplateClass) params.append('class_section', selectedTemplateClass);
      if (templateMonth) params.append('month', String(templateMonth));
      if (templateYear) params.append('year', String(templateYear));
      
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const url = `${apiBaseUrl}/attendance/template?${params.toString()}`;
      
      const token = getAccessToken();
      const projectId = getCurrentProjectId();
      
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (projectId) headers['X-Project-Id'] = String(projectId);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Template download failed:', response.status, errorText);
        throw new Error(`Failed to download template: ${response.status}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'attendance_template.xlsx';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/);
        if (match) filename = match[1];
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success('Template downloaded successfully');
    } catch (error) {
      toast.error('Failed to download template');
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  return (
    <div className="space-y-6">
      {/* Template Download Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Template
          </CardTitle>
          <CardDescription>
            Download an Excel template with student names pre-filled for easy attendance entry
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Class-Section (Optional)</label>
              <Select value={selectedTemplateClass || "__all__"} onValueChange={(v) => setSelectedTemplateClass(v === "__all__" ? "" : v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Classes (Generic)</SelectItem>
                  {classSections?.map((cs) => (
                    <SelectItem key={cs.class_section} value={cs.class_section}>
                      {cs.class_section} ({cs.student_count} students)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <Select value={String(templateMonth)} onValueChange={(v) => setTemplateMonth(Number(v))}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={String(templateYear)} onValueChange={(v) => setTemplateYear(Number(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleDownloadTemplate} disabled={isDownloading}>
              {isDownloading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Attendance
          </CardTitle>
          <CardDescription>
            Upload a filled Excel template with attendance data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                file ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
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
                  <p className="text-sm text-muted-foreground">Excel files only (.xlsx)</p>
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

            {/* Result Display */}
            {uploadResult && (
              <Alert className={uploadResult.failed_rows === 0 ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}>
                {uploadResult.failed_rows === 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                )}
                <AlertTitle className={uploadResult.failed_rows === 0 ? 'text-green-800' : 'text-amber-800'}>
                  {uploadResult.failed_rows === 0 ? 'Upload Successful' : 'Upload Completed with Issues'}
                </AlertTitle>
                <AlertDescription className={uploadResult.failed_rows === 0 ? 'text-green-700' : 'text-amber-700'}>
                  <div className="mt-2 space-y-1">
                    <p>Total rows: {uploadResult.total_rows}</p>
                    <p>Successful: {uploadResult.successful_rows}</p>
                    {uploadResult.failed_rows > 0 && (
                      <p>Failed: {uploadResult.failed_rows}</p>
                    )}
                    {uploadResult.skipped_rows > 0 && (
                      <p>Skipped (empty): {uploadResult.skipped_rows}</p>
                    )}
                  </div>
                  {uploadResult.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium mb-2">Errors:</p>
                      <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
                        {uploadResult.errors.slice(0, 10).map((error, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="text-red-600">Row {error.row}:</span>
                            <span>{error.message}</span>
                          </li>
                        ))}
                        {uploadResult.errors.length > 10 && (
                          <li className="text-muted-foreground">
                            ... and {uploadResult.errors.length - 10} more errors
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
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
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// Attendance Records View Component
// ==========================================
function AttendanceTable() {
  const { project } = useProject();
  const queryClient = useQueryClient();
  const now = new Date();
  
  // Filters for monthly view
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit state
  const [editingCell, setEditingCell] = useState<{ studentId: number; date: string; recordId?: number } | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>('present');

  // Parse class and section from selectedClass
  const { className, section } = useMemo(() => {
    if (!selectedClass) return { className: '', section: '' };
    const parts = selectedClass.split('-');
    if (parts.length >= 2) {
      return { className: parts[0], section: parts.slice(1).join('-') };
    }
    return { className: selectedClass, section: '' };
  }, [selectedClass]);

  // Generate days of the month (excluding Sundays)
  const daysInMonth = useMemo(() => {
    const days: { date: string; day: number; dayName: string }[] = [];
    const year = selectedYear;
    const month = selectedMonth - 1; // JS months are 0-indexed
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      const dayOfWeek = dateObj.getDay(); // 0 = Sunday
      if (dayOfWeek !== 0) { // Exclude Sundays
        days.push({
          date: format(dateObj, 'yyyy-MM-dd'),
          day: d,
          dayName: format(dateObj, 'EEE'), // Mon, Tue, etc.
        });
      }
    }
    return days;
  }, [selectedMonth, selectedYear]);

  // Fetch class sections
  const { data: classSections, isLoading: loadingClasses } = useQuery({
    queryKey: ['class-sections', project?.id],
    queryFn: () => api.get<ClassSection[]>('/attendance/class-sections'),
    enabled: !!project?.id,
  });

  // Fetch students for the selected class
  const { data: studentsData, isLoading: loadingStudents } = useQuery({
    queryKey: ['students-for-attendance', project?.id, className, section],
    queryFn: () =>
      api.get<PaginatedResponse<{ id: number; student_name: string; class_name: string; section?: string }>>('/students', {
        class_name: className,
        section: section || undefined,
        page_size: 100,
      }),
    enabled: !!project?.id && !!className,
  });

  // Fetch attendance records for the month
  const { data, isLoading: loadingAttendance, refetch } = useQuery({
    queryKey: ['attendance-monthly', project?.id, selectedClass, selectedMonth, selectedYear],
    queryFn: () => {
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${lastDay}`;
      
      return api.get<PaginatedResponse<AttendanceRecord>>('/attendance', {
        class_section: selectedClass,
        date_from: startDate,
        date_to: endDate,
        page_size: 2000, // Get all records for the month
      });
    },
    enabled: !!project?.id && !!selectedClass,
  });

  const isLoading = loadingStudents || loadingAttendance;

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: AttendanceStatus }) =>
      api.patch<AttendanceRecord>(`/attendance/${id}`, { status }),
    onSuccess: () => {
      toast.success('Attendance updated');
      setEditingCell(null);
      queryClient.invalidateQueries({ queryKey: ['attendance-monthly'] });
    },
    onError: () => {
      toast.error('Failed to update attendance');
    },
  });

  // Create mutation for new records
  const createMutation = useMutation({
    mutationFn: (data: { student_id: number; attendance_date: string; status: AttendanceStatus }) =>
      api.post<AttendanceRecord>('/attendance', data),
    onSuccess: () => {
      toast.success('Attendance saved');
      setEditingCell(null);
      queryClient.invalidateQueries({ queryKey: ['attendance-monthly'] });
    },
    onError: () => {
      toast.error('Failed to save attendance');
    },
  });

  // Process records into a lookup map: studentId -> date -> record
  // Use students from the students API, not from attendance records
  const { studentList, attendanceMap } = useMemo(() => {
    const records = data?.items || [];
    const students = studentsData?.items || [];
    const attMap = new Map<string, AttendanceRecord>(); // key: `${studentId}-${date}`

    // Build attendance lookup map
    records.forEach((record) => {
      attMap.set(`${record.student_id}-${record.attendance_date}`, record);
    });

    // Use students from the students API (all students in the class)
    const studentListData = students.map((s) => ({
      id: s.id,
      name: s.student_name,
      classSection: `${s.class_name}${s.section ? '-' + s.section : ''}`,
    })).sort((a, b) => a.name.localeCompare(b.name));

    return { studentList: studentListData, attendanceMap: attMap };
  }, [data, studentsData]);

  // Filter students by search
  const filteredStudents = studentList.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate summary for each student
  const getStudentSummary = (studentId: number) => {
    let present = 0, absent = 0, total = 0;
    daysInMonth.forEach(({ date }) => {
      const record = attendanceMap.get(`${studentId}-${date}`);
      if (record) {
        total++;
        if (record.status === 'present') present++;
        else if (record.status === 'absent') absent++;
      }
    });
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, absent, total, percentage };
  };

  const handleCellClick = (studentId: number, date: string) => {
    const record = attendanceMap.get(`${studentId}-${date}`);
    setEditingCell({ studentId, date, recordId: record?.id });
    setEditStatus(record?.status || 'present');
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;
    
    if (editingCell.recordId) {
      // Update existing record
      updateMutation.mutate({ id: editingCell.recordId, status: editStatus });
    } else {
      // Create new record
      createMutation.mutate({
        student_id: editingCell.studentId,
        attendance_date: editingCell.date,
        status: editStatus,
      });
    }
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const years = [selectedYear - 1, selectedYear, selectedYear + 1];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Monthly Attendance View</CardTitle>
            <CardDescription>View attendance for a class in monthly calendar format</CardDescription>
          </div>
          {selectedClass && (
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-sm font-medium">Class-Section</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classSections?.map((cs) => (
                  <SelectItem key={cs.class_section} value={cs.class_section}>
                    {cs.class_section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Month</label>
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Year</label>
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedClass && (
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
        </div>

        {/* Monthly Table */}
        {!selectedClass ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a class to view monthly attendance</p>
          </div>
        ) : isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : studentList.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No students found in this class</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No students match your search</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[180px]">Student</TableHead>
                  {daysInMonth.map(({ day, dayName }) => (
                    <TableHead key={day} className="text-center px-1 min-w-[40px]">
                      <div className="text-xs">{dayName}</div>
                      <div>{day}</div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center min-w-[60px]">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => {
                  const summary = getStudentSummary(student.id);
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium">
                        {student.name}
                      </TableCell>
                      {daysInMonth.map(({ date, day }) => {
                        const record = attendanceMap.get(`${student.id}-${date}`);
                        const status = record?.status;
                        return (
                          <TableCell
                            key={day}
                            className="text-center px-1 cursor-pointer hover:bg-muted/50"
                            onClick={() => handleCellClick(student.id, date)}
                          >
                            {status === 'present' && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-xs font-medium">
                                P
                              </span>
                            )}
                            {status === 'absent' && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-medium">
                                A
                              </span>
                            )}
                            {(status === 'late' || status === 'excused') && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500 text-white text-xs font-medium">
                                {status === 'late' ? 'L' : 'E'}
                              </span>
                            )}
                            {!status && (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-medium">
                        <span className={summary.percentage >= 75 ? 'text-green-600' : summary.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                          {summary.percentage}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Legend */}
        {selectedClass && filteredStudents.length > 0 && (
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-xs font-medium">P</span>
              <span>Present</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-medium">A</span>
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">-</span>
              <span>No record</span>
            </div>
            <div className="ml-auto text-xs">
              Click on any cell to edit
            </div>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingCell} onOpenChange={() => setEditingCell(null)}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>Edit Attendance</DialogTitle>
              <DialogDescription>
                {editingCell && format(parseISO(editingCell.date), 'MMMM d, yyyy')}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 justify-center py-4">
              <Button
                variant={editStatus === 'present' ? 'default' : 'outline'}
                className={`w-20 ${editStatus === 'present' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                onClick={() => setEditStatus('present')}
              >
                Present
              </Button>
              <Button
                variant={editStatus === 'absent' ? 'default' : 'outline'}
                className={`w-20 ${editStatus === 'absent' ? 'bg-red-500 hover:bg-red-600' : ''}`}
                onClick={() => setEditStatus('absent')}
              >
                Absent
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingCell(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateMutation.isPending || createMutation.isPending}>
                {(updateMutation.isPending || createMutation.isPending) ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ==========================================
// Main Page Component
// ==========================================
export default function AttendancePage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground mt-1">
            Manage student attendance - enter manually or upload from Excel
          </p>
        </div>

        <Tabs defaultValue="manual" className="space-y-4">
          <TabsList>
            <PermissionGuard permission="attendance:create">
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </PermissionGuard>
            <PermissionGuard permission="attendance:create">
              <TabsTrigger value="upload">Bulk Upload</TabsTrigger>
            </PermissionGuard>
            <PermissionGuard permission="attendance:view">
              <TabsTrigger value="view">View Records</TabsTrigger>
            </PermissionGuard>
          </TabsList>

          <PermissionGuard permission="attendance:create">
            <TabsContent value="manual">
              <ManualAttendanceEntry />
            </TabsContent>
          </PermissionGuard>

          <PermissionGuard permission="attendance:create">
            <TabsContent value="upload">
              <AttendanceUploader />
            </TabsContent>
          </PermissionGuard>

          <PermissionGuard permission="attendance:view">
            <TabsContent value="view">
              <AttendanceTable />
            </TabsContent>
          </PermissionGuard>
        </Tabs>
      </div>
    </MainLayout>
  );
}
