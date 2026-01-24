'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Search,
  Users,
  Edit,
  Trash2,
  MoreHorizontal,
  Upload,
  Building2,
  Shield,
  Mail,
  Phone,
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
import type { User, Role, Project, UserWithRoles } from '@/types';
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

interface UserFormData {
  name: string;
  username: string;
  phone: string;
  password: string;
  is_active: boolean;
  is_super_admin: boolean;
}

interface ProjectRoleMapping {
  project_id: number;
  role_ids: number[];
}

// Create/Edit User Dialog
function UserDialog({
  user,
  open,
  onClose,
}: {
  user?: UserWithRoles;
  open: boolean;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<UserFormData>({
    name: user?.name || '',
    username: user?.username || '',
    phone: user?.phone || '',
    password: '',
    is_active: user?.is_active ?? true,
    is_super_admin: user?.is_super_admin ?? false,
  });
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: UserFormData) =>
      user
        ? api.patch<User>(`/auth/users/${user.id}`, data)
        : api.post<User>('/auth/register', data),
    onSuccess: () => {
      toast.success(user ? 'User updated successfully' : 'User created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onClose();
    },
    onError: () => {
      toast.error(user ? 'Failed to update user' : 'Failed to create user');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-125">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{user ? 'Edit User' : 'Create New User'}</DialogTitle>
            <DialogDescription>
              {user ? 'Update user details' : 'Add a new user to the system'}
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
                type="text"
                value={formData.username}
                onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="johndoe"
                disabled={!!user}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 234 567 8900"
              />
            </div>
            {!user && (
              <div className="grid gap-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  minLength={8}
                  required={!user}
                />
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: !!checked }))
                  }
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Active
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_super_admin"
                  checked={formData.is_super_admin}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_super_admin: !!checked }))
                  }
                />
                <Label htmlFor="is_super_admin" className="cursor-pointer">
                  Super Admin
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : user ? 'Update User' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Project-Role Mapping Dialog
function ProjectRoleMappingDialog({
  user,
  projects,
  open,
  onClose,
}: {
  user: UserWithRoles;
  projects: Project[];
  open: boolean;
  onClose: () => void;
}) {
  // Initialize state from user prop - component is keyed so it remounts with new user
  const [mappings, setMappings] = useState<ProjectRoleMapping[]>(() => 
    user.project_roles?.map((pr) => ({
      project_id: pr.project_id,
      role_ids: pr.roles.map((r) => r.id),
    })) || []
  );
  const [selectedProject, setSelectedProject] = useState<string>('');
  const queryClient = useQueryClient();

  // Fetch roles for each project
  const { data: rolesData } = useQuery({
    queryKey: ['all-roles'],
    queryFn: async () => {
      const response = await api.get<{
        id: number;
        name: string;
        description: string;
        permissions: { id: number; permission_key: string; description: string | null }[];
        project_id: number;
        project_name?: string;
        is_project_admin: boolean;
        is_role_admin: boolean;
        created_at: string;
        updated_at: string;
      }[]>('/roles/all');
      // Map permissions to string array
      return response.map((role) => ({
        ...role,
        permissions: role.permissions.map((p) => p.permission_key),
      }));
    },
  });

  const roles = rolesData || [];

  const mutation = useMutation({
    mutationFn: (data: { user_id: number; mappings: ProjectRoleMapping[] }) =>
      api.post('/roles/users/bulk-assign', data),
    onSuccess: () => {
      toast.success('Project-role mappings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onClose();
    },
    onError: () => {
      toast.error('Failed to update mappings');
    },
  });

  const handleAddProject = () => {
    if (!selectedProject) return;
    const projectId = parseInt(selectedProject);
    if (mappings.find((m) => m.project_id === projectId)) {
      toast.error('Project already added');
      return;
    }
    setMappings((prev) => [...prev, { project_id: projectId, role_ids: [] }]);
    setSelectedProject('');
  };

  const handleRemoveProject = (projectId: number) => {
    setMappings((prev) => prev.filter((m) => m.project_id !== projectId));
  };

  const handleToggleRole = (projectId: number, roleId: number) => {
    setMappings((prev) =>
      prev.map((m) => {
        if (m.project_id !== projectId) return m;
        const hasRole = m.role_ids.includes(roleId);
        return {
          ...m,
          role_ids: hasRole
            ? m.role_ids.filter((id) => id !== roleId)
            : [...m.role_ids, roleId],
        };
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ user_id: user.id, mappings });
  };

  const getProjectName = (projectId: number) => {
    return projects.find((p) => p.id === projectId)?.name || 'Unknown';
  };

  const getProjectRoles = (projectId: number) => {
    return roles.filter((r) => r.project_id === projectId);
  };

  const availableProjects = projects.filter(
    (p) => !mappings.find((m) => m.project_id === p.id)
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader>
            <DialogTitle>Manage Project-Role Mappings</DialogTitle>
            <DialogDescription>
              Assign roles to {user.name} in different projects
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto py-4 space-y-4">
            {/* User Info */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
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

            {/* Add Project */}
            <div className="flex gap-2">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a project to add" />
                </SelectTrigger>
                <SelectContent>
                  {availableProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" onClick={handleAddProject} disabled={!selectedProject}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Project-Role Mappings */}
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {mappings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No projects assigned</p>
                    <p className="text-sm">Add a project above to assign roles</p>
                  </div>
                ) : (
                  mappings.map((mapping) => (
                    <Card key={mapping.project_id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {getProjectName(mapping.project_id)}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveProject(mapping.project_id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <Separator className="mb-3" />
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Roles</Label>
                          {getProjectRoles(mapping.project_id).length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No roles available for this project
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {getProjectRoles(mapping.project_id).map((role) => {
                                const isChecked = mapping.role_ids.includes(role.id);
                                return (
                                  <div
                                    key={role.id}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                                      isChecked
                                        ? 'bg-primary/10 border-primary'
                                        : 'hover:bg-muted'
                                    }`}
                                    onClick={() =>
                                      handleToggleRole(mapping.project_id, role.id)
                                    }
                                  >
                                    <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                                      isChecked ? 'bg-primary border-primary' : 'border-input'
                                    }`}>
                                      {isChecked && (
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="3"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          className="h-3 w-3 text-primary-foreground"
                                        >
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                      )}
                                    </div>
                                    <span className="text-sm">{role.name}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save Mappings'}
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
  const [result, setResult] = useState<{
    total_rows: number;
    successful_rows: number;
    failed_rows: number;
    errors: { row: number; column?: string; message: string }[];
    message: string;
  } | null>(null);
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
      const response = await fetch('/api/v1/auth/users/template?include_role=true', {
        headers: {
          Authorization: `Bearer ${document.cookie.split('auth_token=')[1]?.split(';')[0]}`,
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
      const uploadResult = await api.upload<{
        total_rows: number;
        successful_rows: number;
        failed_rows: number;
        errors: { row: number; column?: string; message: string }[];
        message: string;
      }>('/auth/users/upload', formData);
      
      setResult(uploadResult);
      
      if (uploadResult.successful_rows > 0) {
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
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
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Upload Users</DialogTitle>
          <DialogDescription>
            Upload an Excel file to create multiple users at once
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {/* Download Template Button */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Upload className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium">Download Template</p>
                <p className="text-sm text-muted-foreground">
                  Use this template to prepare your data
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              Download
            </Button>
          </div>
          
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
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

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRoles | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRoles | null>(null);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [mappingUser, setMappingUser] = useState<UserWithRoles | null>(null);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all users (with optional unassigned filter)
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users', showUnassignedOnly],
    queryFn: () => api.get<UserWithRoles[]>(`/auth/users${showUnassignedOnly ? '?unassigned_only=true' : ''}`),
    enabled: currentUser?.is_super_admin,
  });

  // Fetch all projects
  const { data: projectsData } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: () => api.get<Project[]>('/projects'),
    enabled: currentUser?.is_super_admin,
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => api.delete(`/auth/users/${userId}`),
    onSuccess: () => {
      toast.success('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: () => {
      toast.error('Failed to delete user');
    },
  });

  const users = usersData || [];
  const projects = projectsData || [];

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (user: UserWithRoles) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingUser(undefined);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingUser(undefined);
  };

  const handleDeleteClick = (user: UserWithRoles) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete.id);
    }
  };

  const handleManageRoles = (user: UserWithRoles) => {
    setMappingUser(user);
    setMappingDialogOpen(true);
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage all users in the system
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkUploadOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Bulk Upload
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </div>
        </div>

        {/* Search and Stats */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={showUnassignedOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}
            >
              {showUnassignedOnly ? 'Showing Unassigned' : 'Show Unassigned'}
            </Button>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Total: {users.length}</span>
            <span>Active: {users.filter((u) => u.is_active).length}</span>
            <span>Super Admins: {users.filter((u) => u.is_super_admin).length}</span>
          </div>
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Users Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? 'No users match your search criteria'
                    : 'Get started by creating your first user'}
                </p>
                {!searchQuery && (
                  <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create User
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Projects & Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{getUserInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            {user.is_super_admin && (
                              <Badge variant="secondary" className="text-xs">
                                Super Admin
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span>@{user.username}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {user.project_roles?.slice(0, 2).map((pr) => (
                            <div key={pr.project_id} className="flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{pr.project_name}:</span>
                              <div className="flex gap-1">
                                {pr.roles.slice(0, 2).map((role) => (
                                  <Badge key={role.id} variant="outline" className="text-xs">
                                    {role.name}
                                  </Badge>
                                ))}
                                {pr.roles.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{pr.roles.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                          {(user.project_roles?.length || 0) > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{(user.project_roles?.length || 0) - 2} more projects
                            </span>
                          )}
                          {!user.project_roles?.length && (
                            <span className="text-sm text-muted-foreground">No projects assigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleManageRoles(user)}>
                              <Shield className="mr-2 h-4 w-4" />
                              Manage Roles
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteClick(user)}
                              disabled={user.id === currentUser?.id}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <UserDialog user={editingUser} open={dialogOpen} onClose={handleDialogClose} />

      {/* Project-Role Mapping Dialog */}
      {mappingUser && mappingDialogOpen && (
        <ProjectRoleMappingDialog
          key={mappingUser.id}
          user={mappingUser}
          projects={projects}
          open={mappingDialogOpen}
          onClose={() => {
            setMappingDialogOpen(false);
            setMappingUser(null);
          }}
        />
      )}

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog open={bulkUploadOpen} onClose={() => setBulkUploadOpen(false)} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{userToDelete?.name}&quot;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
