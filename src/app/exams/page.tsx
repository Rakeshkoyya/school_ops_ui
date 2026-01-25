'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout';
import { PermissionGuard } from '@/components/guards';
import { api, getAccessToken } from '@/lib/api-client';
import { useProject } from '@/contexts/project-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  GraduationCap,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import type {
  ExamRecord,
  ExamFilters,
  ExamByClassResponse,
  BulkExamCreate,
  BulkExamResponse,
  ExamUploadResult,
  ClassSection,
  PaginatedResponse,
  StudentExamEntry,
  Student,
} from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';

// ==========================================
// Constants
// ==========================================
const SUBJECTS = [
  "Mathematics",
  "English",
  "Science",
  "Social Studies",
  "Hindi",
  "Computer Science",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Geography",
  "Economics",
  "Accountancy",
  "Business Studies",
  "Political Science",
  "Physical Education",
  "Art",
  "Music",
];

const MONTHS = [
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

// Get grade color
const getGradeColor = (grade: string) => {
  if (!grade) return 'bg-gray-100 text-gray-800';
  if (grade.startsWith('A')) return 'bg-green-100 text-green-800';
  if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800';
  if (grade.startsWith('C')) return 'bg-amber-100 text-amber-800';
  if (grade.startsWith('D')) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
};

// ==========================================
// Manual Exam Entry Component
// ==========================================
function ManualExamEntry() {
  const { project } = useProject();
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [examName, setExamName] = useState<string>('');
  const [examDate, setExamDate] = useState<string>('');
  const [maxMarks, setMaxMarks] = useState<number>(100);

  // Set default date on client side to avoid hydration mismatch
  useEffect(() => {
    if (!examDate) {
      setExamDate(format(new Date(), 'yyyy-MM-dd'));
    }
  }, [examDate]);
  const [studentMarks, setStudentMarks] = useState<Map<number, { marks: number; grade?: string; remarks?: string }>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch class sections
  const { data: classSections, isLoading: loadingClasses } = useQuery({
    queryKey: ['class-sections', project?.id],
    queryFn: () => api.get<ClassSection[]>('/exams/class-sections'),
    enabled: !!project?.id,
  });

  // Fetch exam data for selected class, subject, and exam
  const { data: classExamData, isLoading: loadingExam, refetch: refetchExam } = useQuery({
    queryKey: ['exam-by-class', project?.id, selectedClass, selectedSubject, examName],
    queryFn: () =>
      api.get<ExamByClassResponse>('/exams/by-class', {
        class_section: selectedClass,
        subject: selectedSubject,
        exam_name: examName,
      }),
    enabled: !!project?.id && !!selectedClass && !!selectedSubject && !!examName,
  });

  // Initialize student marks when data loads
  useEffect(() => {
    if (classExamData?.students) {
      const map = new Map<number, { marks: number; grade?: string; remarks?: string }>();
      classExamData.students.forEach((student) => {
        map.set(student.student_id, {
          marks: student.marks_obtained ?? 0,
          grade: student.grade ?? undefined,
          remarks: student.remarks ?? undefined,
        });
      });
      setStudentMarks(map);
      if (classExamData.max_marks) {
        setMaxMarks(classExamData.max_marks);
      }
      if (classExamData.exam_date) {
        setExamDate(classExamData.exam_date);
      }
      setHasChanges(false);
    }
  }, [classExamData]);

  // Bulk save mutation
  const saveMutation = useMutation({
    mutationFn: (data: BulkExamCreate) =>
      api.post<BulkExamResponse>('/exams/bulk', data),
    onSuccess: (result) => {
      if (result.failed === 0) {
        toast.success(result.message);
      } else {
        toast.warning(`${result.successful} saved, ${result.failed} failed`);
      }
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      refetchExam();
    },
    onError: () => {
      toast.error('Failed to save exam marks');
    },
  });

  const handleMarksChange = (studentId: number, marks: number) => {
    setStudentMarks((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(studentId) || { marks: 0 };
      newMap.set(studentId, { ...existing, marks: Math.min(marks, maxMarks) });
      return newMap;
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!selectedClass || !selectedSubject || !examName || !examDate) {
      toast.error('Please fill all required fields');
      return;
    }

    const records = Array.from(studentMarks.entries()).map(([student_id, data]) => ({
      student_id,
      marks_obtained: data.marks,
      grade: data.grade,
      remarks: data.remarks,
    }));

    saveMutation.mutate({
      exam_name: examName,
      subject: selectedSubject,
      exam_date: examDate,
      max_marks: maxMarks,
      class_section: selectedClass,
      records,
    });
  };

  // Calculate summary
  const summary = useMemo(() => {
    const marks = Array.from(studentMarks.values()).map(d => d.marks);
    if (marks.length === 0) return { total: 0, avg: 0, highest: 0, lowest: 0 };
    const sum = marks.reduce((a, b) => a + b, 0);
    return {
      total: marks.length,
      avg: Math.round(sum / marks.length * 100) / 100,
      highest: Math.max(...marks),
      lowest: Math.min(...marks),
    };
  }, [studentMarks]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Manual Exam Entry
        </CardTitle>
        <CardDescription>
          Select class, subject, and enter exam marks for all students
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selection Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Class-Section *</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
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
            <label className="text-sm font-medium">Subject *</label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Exam Name *</label>
            <Input
              type="text"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="e.g., Mid-Term 2026"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Exam Date *</label>
            <Input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Max Marks</label>
            <Input
              type="number"
              value={maxMarks}
              onChange={(e) => setMaxMarks(Number(e.target.value))}
              min={1}
            />
          </div>
        </div>

        {/* Load Students Button */}
        {selectedClass && selectedSubject && examName && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetchExam()}
              disabled={loadingExam}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingExam ? 'animate-spin' : ''}`} />
              Load Students
            </Button>
          </div>
        )}

        {/* Summary Stats */}
        {classExamData && classExamData.students.length > 0 && (
          <div className="grid grid-cols-4 gap-4 max-w-xl">
            <div className="bg-muted rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{summary.total}</div>
              <div className="text-xs text-muted-foreground">Students</div>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{summary.avg}</div>
              <div className="text-xs text-muted-foreground">Average</div>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{summary.highest}</div>
              <div className="text-xs text-muted-foreground">Highest</div>
            </div>
            <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{summary.lowest}</div>
              <div className="text-xs text-muted-foreground">Lowest</div>
            </div>
          </div>
        )}

        {/* Students Table */}
        {loadingExam ? (
          <Skeleton className="h-[400px] w-full" />
        ) : !selectedClass || !selectedSubject || !examName ? (
          <div className="text-center py-12 text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select class, subject, and enter exam name to load students</p>
          </div>
        ) : classExamData && classExamData.students.length > 0 ? (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="w-[120px]">Marks (/{maxMarks})</TableHead>
                    <TableHead className="w-[80px]">Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classExamData.students.map((student, index) => {
                    const data = studentMarks.get(student.student_id) || { marks: 0 };
                    return (
                      <TableRow key={student.student_id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{student.student_name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={data.marks}
                            onChange={(e) => handleMarksChange(student.student_id, Number(e.target.value))}
                            min={0}
                            max={maxMarks}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          {data.marks > 0 && (
                            <Badge className={getGradeColor(data.grade || '')}>
                              {data.grade || '-'}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saveMutation.isPending}
                size="lg"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? 'Saving...' : 'Save Exam Marks'}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No students found in this class</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==========================================
// Bulk Upload Component
// ==========================================
function ExamUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadResult, setUploadResult] = useState<ExamUploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { project } = useProject();
  const queryClient = useQueryClient();

  // Template download options
  const [templateClass, setTemplateClass] = useState<string>('');
  const [templateSubject, setTemplateSubject] = useState<string>('');
  const [templateMonth, setTemplateMonth] = useState<number>(1);
  const [templateYear, setTemplateYear] = useState<number>(2026);
  const [isClient, setIsClient] = useState(false);

  // Set default month/year on client side to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
    const now = new Date();
    setTemplateMonth(now.getMonth() + 1);
    setTemplateYear(now.getFullYear());
  }, []);

  // Fetch class sections
  const { data: classSections } = useQuery({
    queryKey: ['class-sections', project?.id],
    queryFn: () => api.get<ClassSection[]>('/exams/class-sections'),
    enabled: !!project?.id,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setUploadStatus('uploading');
      setErrorMessage(null);
      const result = await api.upload<ExamUploadResult>(
        '/exams/upload',
        formData,
        (progress) => setUploadProgress(progress)
      );
      return result;
    },
    onSuccess: (result) => {
      setUploadResult(result);
      if (result.failed_rows === 0) {
        setUploadStatus('success');
        toast.success(result.message);
      } else {
        setUploadStatus('error');
        toast.warning(`${result.successful_rows} succeeded, ${result.failed_rows} failed`);
      }
      queryClient.invalidateQueries({ queryKey: ['exams'] });
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
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.xlsx')) {
        toast.error('Please upload an Excel file (.xlsx)');
        return;
      }
      setFile(selectedFile);
      setUploadStatus('idle');
      setUploadProgress(0);
      setErrorMessage(null);
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
    setErrorMessage(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = async () => {
    if (!project?.id) {
      toast.error('No project selected');
      return;
    }
    
    try {
      const params = new URLSearchParams();
      if (templateClass) params.append('class_section', templateClass);
      if (templateSubject) params.append('subject', templateSubject);
      params.append('month', templateMonth.toString());
      params.append('year', templateYear.toString());

      const token = getAccessToken();
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const url = `${apiBaseUrl}/exams/template?${params.toString()}`;
      
      console.log('=== Template Download Debug ===');
      console.log('Full URL:', url);
      console.log('Project ID:', project.id);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Project-Id': project.id.toString(),
        },
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to download template: ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `exam_template_${templateYear}_${templateMonth.toString().padStart(2, '0')}${templateClass ? `_${templateClass.replace('-', '_')}` : ''}${templateSubject ? `_${templateSubject.replace(' ', '_')}` : ''}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
      toast.success('Template downloaded');
    } catch (error) {
      console.error('Template download error:', error);
      toast.error('Failed to download template');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Upload Exam Results
        </CardTitle>
        <CardDescription>
          Download a template, fill in exam marks, and upload the file
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Download Section */}
        <div className="border rounded-lg p-4 bg-muted/30">
          <h4 className="font-medium mb-3">Download Template</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Class (Optional)</label>
              <Select value={templateClass || '__all__'} onValueChange={(v) => setTemplateClass(v === '__all__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Generic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Generic Template</SelectItem>
                  {classSections?.map((cs) => (
                    <SelectItem key={cs.class_section} value={cs.class_section}>
                      {cs.class_section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Subject (Optional)</label>
              <Select value={templateSubject || '__all__'} onValueChange={(v) => setTemplateSubject(v === '__all__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Subjects</SelectItem>
                  {SUBJECTS.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Month</label>
              <Select value={templateMonth.toString()} onValueChange={(v) => setTemplateMonth(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Year</label>
              <Input
                type="number"
                value={templateYear}
                onChange={(e) => setTemplateYear(Number(e.target.value))}
                min={2020}
                max={2030}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            💡 Select class and subject to get a pre-filled template with student names
          </p>
        </div>

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

        {/* Success State */}
        {uploadStatus === 'success' && uploadResult && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Upload Successful</AlertTitle>
            <AlertDescription className="text-green-700">
              {uploadResult.message} ({uploadResult.successful_rows} rows processed)
            </AlertDescription>
          </Alert>
        )}

        {/* Error State */}
        {uploadStatus === 'error' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Upload Issues</AlertTitle>
            <AlertDescription>
              {errorMessage || (uploadResult ? `${uploadResult.failed_rows} rows failed validation.` : 'Upload failed.')}
              {uploadResult && uploadResult.errors.length > 0 && (
                <ul className="mt-2 text-sm list-disc list-inside">
                  {uploadResult.errors.slice(0, 5).map((err, idx) => (
                    <li key={idx}>Row {err.row}: {err.message}</li>
                  ))}
                  {uploadResult.errors.length > 5 && (
                    <li>...and {uploadResult.errors.length - 5} more errors</li>
                  )}
                </ul>
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
      </CardContent>
    </Card>
  );
}

// ==========================================
// View Exam Records Component (Redesigned)
// ==========================================
function ExamTable() {
  const { project } = useProject();
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: number; field: 'marks' | 'grade' } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Get current month-year as default
  const currentMonthYear = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Handle class change - reset other filters
  const handleClassChange = (value: string) => {
    const newClass = value === '__placeholder__' ? '' : value;
    setSelectedClass(newClass);
    // Reset filters when class changes
    if (newClass !== selectedClass) {
      setSelectedSubject('');
      setSelectedExam('');
      setSelectedMonthYear('');
      setIsInitialized(false);
    }
  };

  // Fetch class sections
  const { data: classSections } = useQuery({
    queryKey: ['class-sections', project?.id],
    queryFn: () => api.get<ClassSection[]>('/exams/class-sections'),
    enabled: !!project?.id,
  });

  // Fetch all records for selected class to get unique subjects, exams, and month-years
  const { data: classRecordsData, isLoading: loadingClassRecords } = useQuery({
    queryKey: ['exams-class-all', project?.id, selectedClass],
    queryFn: () =>
      api.get<PaginatedResponse<ExamRecord>>('/exams', { class_section: selectedClass, page_size: 500 }),
    enabled: !!project?.id && !!selectedClass,
    staleTime: 30000,
  });

  // Get unique filters from the class data
  const classRecords = classRecordsData?.items || [];
  
  // Memoize derived data to prevent recalculation on every render
  const availableSubjects = useMemo(() => 
    [...new Set(classRecords.map(r => r.subject))].sort(), 
    [classRecords]
  );
  
  const availableExams = useMemo(() => 
    [...new Set(classRecords.map(r => r.exam_name))].sort(),  
    [classRecords]
  );
  
  // Get unique month-years from exam dates + current month
  const availableMonthYears = useMemo(() => {
    const monthYearSet = new Set<string>();
    // Always include current month
    monthYearSet.add(currentMonthYear);
    
    classRecords.forEach(r => {
      const d = new Date(r.exam_date);
      const monthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthYearSet.add(monthYear);
    });
    return [...monthYearSet].sort().reverse().map(my => {
      const [year, month] = my.split('-');
      const monthName = MONTHS.find(m => m.value === parseInt(month))?.label || month;
      return { value: my, label: `${monthName} ${year}` };
    });
  }, [classRecords, currentMonthYear]);

  // Auto-select current month or latest available month when class is selected
  useEffect(() => {
    if (selectedClass && !isInitialized && availableMonthYears.length > 0) {
      // Check if current month has data, otherwise use latest available
      const hasCurrentMonth = availableMonthYears.some(my => my.value === currentMonthYear);
      if (hasCurrentMonth) {
        setSelectedMonthYear(currentMonthYear);
      } else {
        // Use the latest (first in the sorted desc list)
        setSelectedMonthYear(availableMonthYears[0].value);
      }
      setIsInitialized(true);
    }
  }, [selectedClass, availableMonthYears, currentMonthYear, isInitialized]);

  // Parse selected month-year
  const parsedMonthYear = useMemo(() => {
    if (!selectedMonthYear) return { month: undefined, year: undefined };
    const [year, month] = selectedMonthYear.split('-');
    return { month: parseInt(month), year: parseInt(year) };
  }, [selectedMonthYear]);

  // Build filters object
  const filters: ExamFilters = useMemo(() => ({
    ...(selectedClass && { class_section: selectedClass }),
    ...(selectedSubject && { subject: selectedSubject }),
    ...(selectedExam && { exam_name: selectedExam }),
    ...(parsedMonthYear.month && { month: parsedMonthYear.month }),
    ...(parsedMonthYear.year && { year: parsedMonthYear.year }),
  }), [selectedClass, selectedSubject, selectedExam, parsedMonthYear]);

  // Fetch filtered records
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['exams', project?.id, filters],
    queryFn: () =>
      api.get<PaginatedResponse<ExamRecord>>('/exams', { ...filters, page_size: 500 }),
    enabled: !!project?.id && !!selectedClass && !!selectedMonthYear,
    staleTime: 30000,
  });

  // Fetch students for selected class (to show all students even without records)
  const { data: studentsData } = useQuery({
    queryKey: ['students-for-class', project?.id, selectedClass],
    queryFn: () => api.get<PaginatedResponse<Student>>('/students', { class_section: selectedClass, page_size: 500 }),
    enabled: !!project?.id && !!selectedClass,
    staleTime: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { marks_obtained?: number; grade?: string } }) =>
      api.patch<ExamRecord>(`/exams/${id}`, data),
    onSuccess: () => {
      toast.success('Updated');
      setEditingCell(null);
      setNewCellEdit(null);
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: () => {
      toast.error('Failed to update');
    },
  });

  // Create mutation for new exam records
  const createMutation = useMutation({
    mutationFn: async (data: { 
      student_id: number; 
      exam_name: string; 
      subject: string; 
      exam_date: string; 
      max_marks: number; 
      marks_obtained: number 
    }) => api.post<ExamRecord>('/exams', data),
    onSuccess: () => {
      toast.success('Record created');
      setNewCellEdit(null);
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: () => {
      toast.error('Failed to create record');
    },
  });

  // State for editing new (empty) cells
  const [newCellEdit, setNewCellEdit] = useState<{ studentId: number; dateStr: string; value: string } | null>(null);

  const records = data?.items || [];
  const allStudents = studentsData?.items || [];

  // Generate all dates for the selected month and organize data
  const { studentData, dateColumns, examInfo } = useMemo(() => {
    if (!parsedMonthYear.month || !parsedMonthYear.year) {
      return { studentData: [], dateColumns: [], examInfo: null };
    }

    const { month, year } = parsedMonthYear;
    
    // Get number of days in the selected month
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Generate all dates for the month
    const allDates: { dateStr: string; day: number; weekNum: number }[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const weekNum = Math.ceil(day / 7);
      allDates.push({ dateStr, day, weekNum });
    }

    // Group by week
    const monthName = MONTHS.find(m => m.value === month)?.label || '';
    const weeks: { weekNum: number; days: { dateStr: string; day: number }[] }[] = [];
    
    allDates.forEach(dateInfo => {
      let weekGroup = weeks.find(w => w.weekNum === dateInfo.weekNum);
      if (!weekGroup) {
        weekGroup = { weekNum: dateInfo.weekNum, days: [] };
        weeks.push(weekGroup);
      }
      weekGroup.days.push({ dateStr: dateInfo.dateStr, day: dateInfo.day });
    });

    // Sort weeks
    weeks.sort((a, b) => a.weekNum - b.weekNum);

    const dateColumns = [{
      monthYear: selectedMonthYear,
      monthName,
      year,
      weeks,
    }];

    // Get exam info - only allow creation when specific exam and subject are selected
    // and we have at least one record to derive max_marks from
    const canCreate = !!selectedExam && !!selectedSubject && records.length > 0;
    const examInfo = canCreate ? {
      examName: selectedExam,
      subject: selectedSubject,
      maxMarks: records[0].max_marks,
      canCreate: true,
    } : {
      examName: selectedExam || 'All Exams',
      subject: selectedSubject || 'All Subjects',
      maxMarks: records.length > 0 ? records[0].max_marks : null,
      canCreate: false,
    };

    // Create a map of records by student_id and date
    const recordsMap = new Map<string, ExamRecord>();
    records.forEach(r => {
      const key = `${r.student_id}-${r.exam_date}`;
      recordsMap.set(key, r);
    });

    // Build student data - use all students from the class, not just those with records
    const studentsToShow = allStudents.length > 0 ? allStudents : 
      [...new Map(records.map(r => [r.student_id, { 
        id: r.student_id, 
        student_name: r.student_name, 
        class_name: r.class_name, 
        section: r.section 
      }])).values()];

    const studentData = studentsToShow.map(student => ({
      studentId: student.id,
      studentName: student.student_name,
      className: student.class_name,
      section: student.section,
      records: new Map(
        allDates.map(d => {
          const key = `${student.id}-${d.dateStr}`;
          return [d.dateStr, recordsMap.get(key) || null];
        })
      ),
    })).sort((a, b) => a.studentName.localeCompare(b.studentName));

    return { studentData, dateColumns, examInfo };
  }, [records, allStudents, parsedMonthYear, selectedMonthYear, selectedExam, selectedSubject]);

  // Calculate total date columns for colspan
  const totalDateColumns = useMemo(() => {
    return dateColumns.reduce((total, month) => 
      total + month.weeks.reduce((wTotal, week) => wTotal + week.days.length, 0), 0
    );
  }, [dateColumns]);

  const handleCellClick = (record: ExamRecord, field: 'marks' | 'grade') => {
    setEditingCell({ id: record.id, field });
    setEditValue(field === 'marks' ? record.marks_obtained.toString() : (record.grade || ''));
    setNewCellEdit(null); // Clear new cell edit when editing existing
  };

  const handleEmptyCellClick = (studentId: number, dateStr: string) => {
    if (!examInfo?.canCreate) {
      toast.error('Please select a specific Exam Type and Subject to add new records');
      return;
    }
    setNewCellEdit({ studentId, dateStr, value: '' });
    setEditValue('');
    setEditingCell(null); // Clear existing cell edit
  };

  const handleCellSave = (recordId: number, field: 'marks' | 'grade', originalValue: number | string) => {
    const newValue = field === 'marks' ? Number(editValue) : editValue;
    // Only update if value has changed
    if (String(newValue) !== String(originalValue)) {
      if (field === 'marks') {
        updateMutation.mutate({ id: recordId, data: { marks_obtained: Number(editValue) } });
      } else {
        updateMutation.mutate({ id: recordId, data: { grade: editValue } });
      }
    } else {
      setEditingCell(null);
    }
  };

  const handleNewCellSave = (studentId: number, dateStr: string) => {
    if (!examInfo?.canCreate || !examInfo.maxMarks || !editValue.trim()) {
      setNewCellEdit(null);
      return;
    }
    
    // Find the student info
    const student = studentData.find(s => s.studentId === studentId);
    if (!student) {
      setNewCellEdit(null);
      return;
    }

    createMutation.mutate({
      student_id: studentId,
      exam_name: examInfo.examName,
      subject: examInfo.subject,
      exam_date: dateStr,
      max_marks: examInfo.maxMarks,
      marks_obtained: Number(editValue),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, recordId: number, field: 'marks' | 'grade', originalValue: number | string) => {
    if (e.key === 'Enter') {
      handleCellSave(recordId, field, originalValue);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleNewCellKeyDown = (e: React.KeyboardEvent, studentId: number, dateStr: string) => {
    if (e.key === 'Enter') {
      handleNewCellSave(studentId, dateStr);
    } else if (e.key === 'Escape') {
      setNewCellEdit(null);
    }
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
            <CardDescription>View and manage exam results with date-wise breakdown</CardDescription>
          </div>
          {selectedClass && (
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Class <span className="text-red-500">*</span></Label>
            <Select value={selectedClass || '__placeholder__'} onValueChange={handleClassChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__placeholder__" disabled>Select class</SelectItem>
                {classSections?.map((cs) => (
                  <SelectItem key={cs.class_section} value={cs.class_section}>
                    {cs.class_section} ({cs.student_count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Subject</Label>
            <Select 
              value={selectedSubject || '__all__'} 
              onValueChange={(v) => setSelectedSubject(v === '__all__' ? '' : v)}
              disabled={!selectedClass || loadingClassRecords}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Subjects</SelectItem>
                {availableSubjects.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Exam Type</Label>
            <Select 
              value={selectedExam || '__all__'} 
              onValueChange={(v) => setSelectedExam(v === '__all__' ? '' : v)}
              disabled={!selectedClass || loadingClassRecords}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Exams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Exams</SelectItem>
                {availableExams.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Month-Year</Label>
            <Select 
              value={selectedMonthYear || '__placeholder__'} 
              onValueChange={(v) => setSelectedMonthYear(v === '__placeholder__' ? '' : v)}
              disabled={!selectedClass || loadingClassRecords}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__placeholder__" disabled>Select Month</SelectItem>
                {availableMonthYears.map((my) => (
                  <SelectItem key={my.value} value={my.value}>{my.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content Area */}
        {!selectedClass ? (
          <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">Select a Class to View Records</p>
            <p className="text-sm mt-2">Choose a class from the dropdown above to display exam records</p>
          </div>
        ) : !selectedMonthYear ? (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">Select a Month</p>
            <p className="text-sm mt-2">Choose a month to view the exam calendar</p>
          </div>
        ) : isLoading || loadingClassRecords ? (
          <Skeleton className="h-96 w-full" />
        ) : studentData.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border rounded-lg">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">No Students Found</p>
            <p className="text-sm mt-2">No students found in the selected class</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Exam Info Header */}
            {examInfo && (
              <div className="flex flex-wrap items-center gap-6 p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Exam Type:</span>
                  <Badge variant="secondary" className="text-sm font-semibold">
                    {examInfo.examName}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Subject:</span>
                  <Badge variant="outline" className="text-sm font-semibold">
                    {examInfo.subject}
                  </Badge>
                </div>
                {examInfo.maxMarks && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Max Marks:</span>
                  <Badge className="text-sm font-semibold bg-blue-100 text-blue-800 hover:bg-blue-100">
                    {examInfo.maxMarks}
                  </Badge>
                </div>
                )}
                <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span><strong>{studentData.length}</strong> students</span>
                  <span className="mx-2">•</span>
                  <Calendar className="h-4 w-4" />
                  <span><strong>{totalDateColumns}</strong> exam dates</span>
                </div>
              </div>
            )}

            {/* Pivot Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    {/* Month Header Row */}
                    <TableRow className="bg-muted/30">
                      <TableHead rowSpan={3} className="w-10 text-center border-r sticky left-0 bg-muted/30 z-20">#</TableHead>
                      <TableHead rowSpan={3} className="border-r sticky  bg-muted/30 z-20 px-2">Student Name</TableHead>
                      <TableHead rowSpan={3} className="w-16 text-center border-r">Class</TableHead>
                      {dateColumns.map((month) => {
                        const totalDays = month.weeks.reduce((sum, w) => sum + w.days.length, 0);
                        return (
                          <TableHead 
                            key={month.monthYear} 
                            colSpan={totalDays}
                            className="text-center border-r bg-primary/10 font-bold"
                          >
                            {month.monthName} {month.year}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                    {/* Week Header Row */}
                    <TableRow className="bg-muted/20">
                      {dateColumns.map((month) => 
                        month.weeks.map((week) => (
                          <TableHead 
                            key={`${month.monthYear}-W${week.weekNum}`} 
                            colSpan={week.days.length}
                            className="text-center border-r text-xs font-medium"
                          >
                            Week {week.weekNum}
                          </TableHead>
                        ))
                      )}
                    </TableRow>
                    {/* Day Header Row */}
                    <TableRow className="bg-muted/10">
                      {dateColumns.map((month) => 
                        month.weeks.map((week) => 
                          week.days.map((day) => (
                            <TableHead 
                              key={day.dateStr} 
                              className="w-14 text-center text-xs font-medium border-r"
                            >
                              {day.day}
                            </TableHead>
                          ))
                        )
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentData.map((student, idx) => (
                      <TableRow key={student.studentId} className="hover:bg-muted/30">
                        <TableCell className="w-10 text-center text-muted-foreground border-r sticky left-0 bg-background z-20">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium border-r sticky left-10 bg-background z-20 px-2">
                          {student.studentName}
                        </TableCell>
                        <TableCell className="w-16 text-center border-r">
                          <Badge variant="outline" className="text-xs">
                            {student.className}{student.section ? `-${student.section}` : ''}
                          </Badge>
                        </TableCell>
                        {dateColumns.map((month) => 
                          month.weeks.map((week) => 
                            week.days.map((day) => {
                              const record = student.records.get(day.dateStr);
                              const isNewCellEditing = newCellEdit?.studentId === student.studentId && newCellEdit?.dateStr === day.dateStr;
                              
                              return (
                                <TableCell 
                                  key={day.dateStr}
                                  className={cn(
                                    "text-center border-r p-1",
                                    (record || examInfo?.canCreate) && "cursor-pointer hover:bg-muted",
                                    (createMutation.isPending || updateMutation.isPending) && "pointer-events-none opacity-50"
                                  )}
                                  onClick={() => {
                                    if (record) {
                                      handleCellClick(record, 'marks');
                                    } else {
                                      handleEmptyCellClick(student.studentId, day.dateStr);
                                    }
                                  }}
                                >
                                  {record ? (
                                    editingCell?.id === record.id && editingCell.field === 'marks' ? (
                                      <Input
                                        type="number"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={() => handleCellSave(record.id, 'marks', record.marks_obtained)}
                                        onKeyDown={(e) => handleKeyDown(e, record.id, 'marks', record.marks_obtained)}
                                        className="w-12 h-6 text-center text-xs mx-auto p-1"
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    ) : (
                                      <span className={cn(
                                        "text-sm font-medium",
                                        record.marks_obtained >= (record.max_marks * 0.9) && "text-green-600",
                                        record.marks_obtained >= (record.max_marks * 0.6) && record.marks_obtained < (record.max_marks * 0.9) && "text-blue-600",
                                        record.marks_obtained < (record.max_marks * 0.4) && "text-red-600"
                                      )}>
                                        {Math.round(record.marks_obtained)}
                                      </span>
                                    )
                                  ) : isNewCellEditing ? (
                                    <Input
                                      type="number"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={() => handleNewCellSave(student.studentId, day.dateStr)}
                                      onKeyDown={(e) => handleNewCellKeyDown(e, student.studentId, day.dateStr)}
                                      className="w-12 h-6 text-center text-xs mx-auto p-1"
                                      autoFocus
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  ) : (
                                    <span className="text-muted-foreground text-sm">-</span>
                                  )}
                                </TableCell>
                              );
                            })
                          )
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Edit2 className="h-3 w-3" />
                Click on marks to edit
              </span>
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  ≥90%
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  60-89%
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  &lt;40%
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==========================================
// Main Page Component
// ==========================================
export default function ExamsPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exams</h1>
          <p className="text-muted-foreground mt-1">
            Manage exam marks - enter manually, upload in bulk, or view records
          </p>
        </div>

        <Tabs defaultValue="manual" className="space-y-4">
          <TabsList>
            <PermissionGuard permission="exam:create">
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </PermissionGuard>
            <PermissionGuard permission="exam:create">
              <TabsTrigger value="upload">Bulk Upload</TabsTrigger>
            </PermissionGuard>
            <PermissionGuard permission="exam:view">
              <TabsTrigger value="view">View Records</TabsTrigger>
            </PermissionGuard>
          </TabsList>

          <PermissionGuard permission="exam:create">
            <TabsContent value="manual">
              <ManualExamEntry />
            </TabsContent>
          </PermissionGuard>

          <PermissionGuard permission="exam:create">
            <TabsContent value="upload">
              <ExamUploader />
            </TabsContent>
          </PermissionGuard>

          <PermissionGuard permission="exam:view">
            <TabsContent value="view">
              <ExamTable />
            </TabsContent>
          </PermissionGuard>
        </Tabs>
      </div>
    </MainLayout>
  );
}
