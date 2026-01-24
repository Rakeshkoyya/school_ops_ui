'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Search,
  GraduationCap,
  Edit,
  Trash2,
  MoreHorizontal,
  Upload,
  Download,
  Phone,
  User,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Student, PaginatedResponse } from '@/types';
import { format, isValid } from 'date-fns';
import { toast } from 'sonner';

// Helper function to safely format dates
const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (!isValid(date)) return '-';
    return format(date, 'MMM d, yyyy');
  } catch {
    return '-';
  }
};

interface StudentFormData {
  student_name: string;
  class_name: string;
  section: string;
  parent_name: string;
  parent_phone_no: string;
}

interface BulkUploadResult {
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  errors: { row: number; column?: string; message: string }[];
  message: string;
}

// Create/Edit Student Dialog
function StudentDialog({
  student,
  open,
  onClose,
}: {
  student?: Student;
  open: boolean;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<StudentFormData>({
    student_name: student?.student_name || '',
    class_name: student?.class_name || '',
    section: student?.section || '',
    parent_name: student?.parent_name || '',
    parent_phone_no: student?.parent_phone_no || '',
  });
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: StudentFormData) =>
      student
        ? api.patch<Student>(`/students/${student.id}`, data)
        : api.post<Student>('/students', data),
    onSuccess: () => {
      toast.success(student ? 'Student updated successfully' : 'Student created successfully');
      queryClient.invalidateQueries({ queryKey: ['students'] });
      onClose();
    },
    onError: () => {
      toast.error(student ? 'Failed to update student' : 'Failed to create student');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{student ? 'Edit Student' : 'Add New Student'}</DialogTitle>
            <DialogDescription>
              {student ? 'Update student details' : 'Add a new student to the system'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="student_name">Student Name *</Label>
              <Input
                id="student_name"
                value={formData.student_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, student_name: e.target.value }))}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="class_name">Class *</Label>
                <Input
                  id="class_name"
                  value={formData.class_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, class_name: e.target.value }))}
                  placeholder="10"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="section">Section</Label>
                <Input
                  id="section"
                  value={formData.section}
                  onChange={(e) => setFormData((prev) => ({ ...prev, section: e.target.value }))}
                  placeholder="A"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="parent_name">Parent Name</Label>
              <Input
                id="parent_name"
                value={formData.parent_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, parent_name: e.target.value }))}
                placeholder="Mr. Doe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="parent_phone_no">Parent Phone</Label>
              <Input
                id="parent_phone_no"
                value={formData.parent_phone_no}
                onChange={(e) => setFormData((prev) => ({ ...prev, parent_phone_no: e.target.value }))}
                placeholder="+1234567890"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : student ? 'Update Student' : 'Add Student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Bulk Upload Dialog
function BulkUploadDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/v1/students/template', {
        headers: {
          Authorization: `Bearer ${document.cookie.split('auth_token=')[1]?.split(';')[0]}`,
          'X-Project-Id': localStorage.getItem('current_project_id') || '',
        },
      });
      
      if (!response.ok) throw new Error('Failed to download template');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'students_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Template downloaded');
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResult = await api.upload<BulkUploadResult>('/students/upload', formData);
      setResult(uploadResult);
      
      if (uploadResult.successful_rows > 0) {
        queryClient.invalidateQueries({ queryKey: ['students'] });
        toast.success(uploadResult.message);
      } else {
        toast.error(uploadResult.message);
      }
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Upload Students</DialogTitle>
          <DialogDescription>
            Upload an Excel file to add multiple students at once
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Download Template Button */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium">Download Template</p>
                <p className="text-sm text-muted-foreground">
                  Use this template to prepare your data
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>

          {/* File Upload Area */}
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            {file ? (
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="font-medium">Click to upload</p>
                <p className="text-sm text-muted-foreground">Excel file (.xlsx)</p>
              </div>
            )}
          </div>

          {/* Upload Result */}
          {result && (
            <div className={`p-4 rounded-lg ${result.failed_rows > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'} border`}>
              <div className="flex items-center gap-2 mb-2">
                {result.failed_rows > 0 ? (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                <span className="font-medium">{result.message}</span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600">✓ {result.successful_rows} successful</span>
                {result.failed_rows > 0 && (
                  <span className="text-red-600">✗ {result.failed_rows} failed</span>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="mt-3 max-h-32 overflow-auto">
                  <p className="text-sm font-medium mb-1">Errors:</p>
                  {result.errors.slice(0, 5).map((error, idx) => (
                    <p key={idx} className="text-xs text-red-600">
                      Row {error.row}: {error.message}
                    </p>
                  ))}
                  {result.errors.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      ...and {result.errors.length - 5} more errors
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function StudentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('');
  const [sectionFilter, setSectionFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const pageSize = 50;

  // Fetch students
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students', page, classFilter, sectionFilter, searchQuery],
    queryFn: () =>
      api.get<PaginatedResponse<Student>>('/students', {
        page,
        page_size: pageSize,
        class_name: classFilter || undefined,
        section: sectionFilter || undefined,
        search: searchQuery || undefined,
      }),
  });

  // Fetch class-section combinations
  const { data: classesData } = useQuery({
    queryKey: ['student-classes'],
    queryFn: () => api.get<{ class_name: string; section: string | null }[]>('/students/classes'),
  });

  const deleteMutation = useMutation({
    mutationFn: (studentId: number) => api.delete(`/students/${studentId}`),
    onSuccess: () => {
      toast.success('Student deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setDeleteDialogOpen(false);
      setStudentToDelete(null);
    },
    onError: () => {
      toast.error('Failed to delete student');
    },
  });

  const students = studentsData?.items || [];
  const total = studentsData?.total || 0;
  const totalPages = studentsData?.total_pages || 1;

  // Get unique classes and sections
  const classes = [...new Set(classesData?.map((c) => c.class_name) || [])].sort();
  const sections = [...new Set(
    classesData
      ?.filter((c) => !classFilter || c.class_name === classFilter)
      .map((c) => c.section)
      .filter(Boolean) || []
  )].sort();

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingStudent(undefined);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingStudent(undefined);
  };

  const handleDeleteClick = (student: Student) => {
    setStudentToDelete(student);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (studentToDelete) {
      deleteMutation.mutate(studentToDelete.id);
    }
  };

  const canCreate = hasPermission('student:create');
  const canUpdate = hasPermission('student:update');
  const canDelete = hasPermission('student:delete');
  const canUpload = hasPermission('student:upload');

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Students</h1>
            <p className="text-muted-foreground mt-1">
              Manage student records ({total} total)
            </p>
          </div>
          <div className="flex gap-2">
            {canUpload && (
              <Button variant="outline" onClick={() => setBulkUploadOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Bulk Upload
              </Button>
            )}
            {canCreate && (
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Select
                value={classFilter}
                onValueChange={(value) => {
                  setClassFilter(value === 'all' ? '' : value);
                  setSectionFilter('');
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      Class {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sectionFilter}
                onValueChange={(value) => {
                  setSectionFilter(value === 'all' ? '' : value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sections.map((sec) => (
                    <SelectItem key={sec} value={sec!}>
                      Section {sec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(searchQuery || classFilter || sectionFilter) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery('');
                    setClassFilter('');
                    setSectionFilter('');
                    setPage(1);
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium">No students found</h3>
                <p className="text-muted-foreground mt-1">
                  {searchQuery || classFilter || sectionFilter
                    ? 'Try adjusting your filters'
                    : 'Add students to get started'}
                </p>
                {canCreate && !searchQuery && !classFilter && !sectionFilter && (
                  <Button className="mt-4" onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Student
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Parent Name</TableHead>
                    <TableHead>Parent Phone</TableHead>
                    <TableHead>Added On</TableHead>
                    {(canUpdate || canDelete) && (
                      <TableHead className="w-[70px]">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <GraduationCap className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{student.student_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Class {student.class_name}</Badge>
                      </TableCell>
                      <TableCell>
                        {student.section ? (
                          <Badge variant="secondary">Section {student.section}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {student.parent_name ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {student.parent_name}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {student.parent_phone_no ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {student.parent_phone_no}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(student.created_at)}
                      </TableCell>
                      {(canUpdate || canDelete) && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canUpdate && (
                                <DropdownMenuItem onClick={() => handleEdit(student)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem
                                  onClick={() => handleDeleteClick(student)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} students
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {dialogOpen && (
        <StudentDialog
          student={editingStudent}
          open={dialogOpen}
          onClose={handleDialogClose}
        />
      )}

      <BulkUploadDialog open={bulkUploadOpen} onClose={() => setBulkUploadOpen(false)} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {studentToDelete?.student_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
