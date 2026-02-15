'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout';
import { api } from '@/lib/api-client';
import { useProject } from '@/contexts/project-context';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Users,
  Shield,
  MoreHorizontal,
  Calendar,
  Plus,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import type { Role } from '@/types';
import { format, isValid } from 'date-fns';
import { toast } from 'sonner';

// Type for project-scoped user
interface ProjectUser {
  id: number;
  name: string;
  username: string;
  phone: string | null;
  is_active: boolean;
  is_super_admin: boolean;
  evo_points: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  project_roles: {
    project_id: number;
    project_name: string;
    roles: { id: number; name: string }[];
  }[];
}

interface BulkUploadResult {
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  errors: { row: number; column?: string; message: string }[];
  message: string;
}

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

// Add User Dialog
function AddUserDialog({
  roles,
  open,
  onClose,
}: {
  roles: Role[];
  open: boolean;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    phone: '',
    password: '',
    role_id: '',
  });
  const queryClient = useQueryClient();
  const { project } = useProject();

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // First register user
      const userResponse = await api.post<{ id: number }>('/auth/register', {
        name: data.name,
        username: data.username,
        phone: data.phone || undefined,
        password: data.password,
      });

      // Then assign role to project if selected
      if (data.role_id && project?.id) {
        await api.post('/roles/users', {
          user_id: userResponse.id,
          role_id: parseInt(data.role_id),
        });
      }

      return userResponse;
    },
    onSuccess: () => {
      toast.success('User created and added to project');
      queryClient.invalidateQueries({ queryKey: ['project-users'] });
      onClose();
      setFormData({ name: '', username: '', phone: '', password: '', role_id: '' });
    },
    onError: () => {
      toast.error('Failed to create user');
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
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user and assign them to this project
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="johndoe"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+1234567890"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Assign Role</Label>
              <select
                id="role"
                value={formData.role_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, role_id: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit User Dialog
function EditUserDialog({
  user,
  open,
  onClose,
}: {
  user: ProjectUser;
  open: boolean;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: user.name,
    phone: user.phone || '',
    is_active: user.is_active,
  });
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: typeof formData) =>
      api.patch(`/auth/project-users/${user.id}`, {
        name: data.name,
        phone: data.phone || undefined,
        is_active: data.is_active,
      }),
    onSuccess: () => {
      toast.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['project-users'] });
      onClose();
    },
    onError: () => {
      toast.error('Failed to update user');
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
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details for {user.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+1234567890"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_active: !!checked }))
                }
              />
              <Label htmlFor="edit-is_active" className="cursor-pointer">
                Active
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Bulk Upload Dialog
function BulkUploadDialog({
  roles,
  open,
  onClose,
}: {
  roles: Role[];
  open: boolean;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [defaultRoleId, setDefaultRoleId] = useState('');
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx')) {
        toast.error('Please upload an Excel file (.xlsx)');
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/v1/auth/project-users/template', {
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
      a.download = 'users_template.xlsx';
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
    const formData = new FormData();
    formData.append('file', file);

    try {
      const url = defaultRoleId
        ? `/auth/project-users/upload?default_role_id=${defaultRoleId}`
        : '/auth/project-users/upload';

      const uploadResult = await api.upload<BulkUploadResult>(url, formData);
      setResult(uploadResult);

      if (uploadResult.successful_rows > 0) {
        queryClient.invalidateQueries({ queryKey: ['project-users'] });
        toast.success(uploadResult.message);
      } else {
        toast.error(uploadResult.message);
      }
    } catch (error) {
      toast.error('Failed to upload users');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setDefaultRoleId('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Upload Users</DialogTitle>
          <DialogDescription>
            Upload an Excel file to add multiple users to this project
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {/* Download Template */}
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

          {/* Default Role Selection */}
          <div className="grid gap-2">
            <Label>Default Role (optional)</Label>
            <select
              value={defaultRoleId}
              onChange={(e) => setDefaultRoleId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">No default role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Applied when Role ID is not specified in the Excel file
            </p>
          </div>

          {/* File Upload */}
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

          {/* Result */}
          {result && (
            <div
              className={`p-4 rounded-lg border ${
                result.failed_rows > 0
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-green-50 border-green-200'
              }`}
            >
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

// Assign Roles Dialog
function AssignRolesDialog({
  user,
  roles,
  open,
  onClose,
}: {
  user: ProjectUser;
  roles: Role[];
  open: boolean;
  onClose: () => void;
}) {
  const currentRoles = user.project_roles?.[0]?.roles || [];
  const [selectedRoles, setSelectedRoles] = useState<number[]>(
    currentRoles.map((r) => r.id)
  );
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (roleIds: number[]) => {
      // Use PUT to replace all roles for the user
      return api.put(`/roles/users/${user.id}/roles`, {
        role_ids: roleIds,
      });
    },
    onSuccess: () => {
      toast.success('Roles updated successfully');
      queryClient.invalidateQueries({ queryKey: ['project-users'] });
      onClose();
    },
    onError: () => {
      toast.error('Failed to update roles');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(selectedRoles);
  };

  const toggleRole = (roleId: number) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Manage User Roles</DialogTitle>
            <DialogDescription>Assign or remove roles for {user.name}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted mb-4">
              <Avatar>
                <AvatarFallback>
                  {user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
              </div>
            </div>

            <Label className="mb-3 block">Select Roles</Label>
            <ScrollArea className="h-[250px] rounded-md border p-4">
              <div className="space-y-3">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Checkbox
                      id={String(role.id)}
                      checked={selectedRoles.includes(role.id)}
                      onCheckedChange={() => toggleRole(role.id)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={String(role.id)} className="cursor-pointer font-medium">
                        {role.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<ProjectUser | null>(null);
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ProjectUser | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<ProjectUser | null>(null);
  const { project } = useProject();
  const { hasPermission, user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['project-users', project?.id],
    queryFn: () => api.get<ProjectUser[]>('/auth/project-users'),
    enabled: !!project?.id,
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles', project?.id],
    queryFn: () => api.get<Role[]>('/roles'),
    enabled: !!project?.id,
  });

  const removeMutation = useMutation({
    mutationFn: (userId: number) => api.delete(`/auth/project-users/${userId}`),
    onSuccess: () => {
      toast.success('User removed from project');
      queryClient.invalidateQueries({ queryKey: ['project-users'] });
      setRemoveDialogOpen(false);
      setUserToRemove(null);
    },
    onError: () => {
      toast.error('Failed to remove user');
    },
  });

  const users = usersData || [];
  const roles = rolesData || [];

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleManageRoles = (user: ProjectUser) => {
    setSelectedUser(user);
    setRolesDialogOpen(true);
  };

  const handleEdit = (user: ProjectUser) => {
    setEditingUser(user);
    setEditDialogOpen(true);
  };

  const handleRemoveClick = (user: ProjectUser) => {
    setUserToRemove(user);
    setRemoveDialogOpen(true);
  };

  const handleRemoveConfirm = () => {
    if (userToRemove) {
      removeMutation.mutate(userToRemove.id);
    }
  };

  const canInvite = hasPermission('user:invite');
  const canRemove = hasPermission('user:remove');
  const canManageRoles = hasPermission('role:assign');
  // Can perform actions if user can invite (edit) or remove users, or manage roles
  const canPerformActions = canInvite || canRemove || canManageRoles;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground mt-1">
              Manage users and their role assignments
            </p>
          </div>
          {canInvite && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBulkUploadOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Bulk Upload
              </Button>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{roles.length}</p>
                  <p className="text-sm text-muted-foreground">Available Roles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {users.filter((u) => u.is_active).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>Manage user role assignments</CardDescription>
              </div>
              <div className="relative w-full sm:w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium">No users yet</h3>
                <p className="text-muted-foreground mt-1">
                  Add users to this project to get started
                </p>
                {canInvite && (
                  <Button className="mt-4" onClick={() => setAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First User
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      {canPerformActions && <TableHead className="w-[80px]">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {user.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">@{user.username}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.project_roles?.[0]?.roles.map((role) => (
                              <Badge key={role.id} variant="secondary">
                                {role.name}
                              </Badge>
                            ))}
                            {(!user.project_roles?.[0]?.roles ||
                              user.project_roles[0].roles.length === 0) && (
                              <span className="text-muted-foreground text-sm">No roles</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? 'default' : 'secondary'}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(user.created_at)}
                          </div>
                        </TableCell>
                        {canPerformActions && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canInvite && (
                                  <DropdownMenuItem 
                                    onClick={() => handleEdit(user)}
                                    disabled={user.id === currentUser?.id}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                {canManageRoles && (
                                  <DropdownMenuItem onClick={() => handleManageRoles(user)}>
                                    <Shield className="mr-2 h-4 w-4" />
                                    Manage Roles
                                  </DropdownMenuItem>
                                )}
                                {canRemove && (
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleRemoveClick(user)}
                                    disabled={user.id === currentUser?.id}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remove from Project
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialogs */}
        <AddUserDialog roles={roles} open={addDialogOpen} onClose={() => setAddDialogOpen(false)} />

        <BulkUploadDialog
          roles={roles}
          open={bulkUploadOpen}
          onClose={() => setBulkUploadOpen(false)}
        />

        {selectedUser && (
          <AssignRolesDialog
            user={selectedUser}
            roles={roles}
            open={rolesDialogOpen}
            onClose={() => {
              setRolesDialogOpen(false);
              setSelectedUser(null);
            }}
          />
        )}

        {/* Edit User Dialog */}
        {editingUser && (
          <EditUserDialog
            key={editingUser.id}
            user={editingUser}
            open={editDialogOpen}
            onClose={() => {
              setEditDialogOpen(false);
              setEditingUser(null);
            }}
          />
        )}

        {/* Remove User Confirmation Dialog */}
        <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove User from Project</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove &quot;{userToRemove?.name}&quot; from this project? 
                They will lose access to this project but their account will not be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {removeMutation.isPending ? 'Removing...' : 'Remove User'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
