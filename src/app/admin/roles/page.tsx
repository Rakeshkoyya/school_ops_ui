'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Search,
  Shield,
  Edit,
  Trash2,
  MoreHorizontal,
  Building2,
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
import { PermissionsByMenu } from '@/components/roles';
import type { Role, Project, Permission } from '@/types';
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

interface RoleFormData {
  name: string;
  description: string;
  project_id: number | null;
  permissions: string[];
  is_project_admin: boolean;
  is_role_admin: boolean;
}

// API response type for roles with permissions as string keys
interface RoleApiResponse {
  id: number;
  name: string;
  description: string;
  permissions: string[];  // Permission keys like 'task:view'
  project_id: number;
  project_name?: string;
  is_project_admin: boolean;
  is_role_admin: boolean;
  created_at: string;
  updated_at: string;
}

// Helper to convert API response to Role type
const mapApiRoleToRole = (apiRole: RoleApiResponse): Role => ({
  id: apiRole.id,
  name: apiRole.name,
  description: apiRole.description,
  permissions: apiRole.permissions,  // Already string keys from backend
  project_id: apiRole.project_id,
  project_name: apiRole.project_name,
  created_at: apiRole.created_at,
  updated_at: apiRole.updated_at,
});

// Create/Edit Role Dialog
function RoleDialog({
  role,
  projects,
  open,
  onClose,
}: {
  role?: Role;
  projects: Project[];
  open: boolean;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<RoleFormData>({
    name: role?.name || '',
    description: role?.description || '',
    project_id: role?.project_id || null,
    permissions: role?.permissions || [],
    is_project_admin: false,
    is_role_admin: false,
  });
  const queryClient = useQueryClient();

  // Reset form when dialog opens or role changes
  useEffect(() => {
    if (open) {
      setFormData({
        name: role?.name || '',
        description: role?.description || '',
        project_id: role?.project_id || null,
        permissions: role?.permissions || [],
        is_project_admin: false,
        is_role_admin: false,
      });
    }
  }, [open, role]);

  // Permission toggle handlers for PermissionsByMenu component
  const handlePermissionToggle = useCallback((permission: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  }, []);

  const handleCategoryToggle = useCallback((categoryPermissions: string[]) => {
    setFormData((prev) => {
      const allSelected = categoryPermissions.every((p) => prev.permissions.includes(p));
      if (allSelected) {
        return { ...prev, permissions: prev.permissions.filter((p) => !categoryPermissions.includes(p)) };
      } else {
        return { ...prev, permissions: [...new Set([...prev.permissions, ...categoryPermissions])] };
      }
    });
  }, []);

  const mutation = useMutation({
    mutationFn: (data: RoleFormData) =>
      role
        ? api.patch<Role>(`/roles/admin/${role.id}`, { ...data, project_id: data.project_id })
        : api.post<Role>('/roles/admin', data),
    onSuccess: () => {
      toast.success(role ? 'Role updated successfully' : 'Role created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      onClose();
    },
    onError: () => {
      toast.error(role ? 'Failed to update role' : 'Failed to create role');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-150 max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <DialogHeader>
            <DialogTitle>{role ? 'Edit Role' : 'Create New Role'}</DialogTitle>
            <DialogDescription>
              {role ? 'Update role details and permissions' : 'Define a new role with specific permissions'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0">
            <div className="grid gap-2">
              <Label htmlFor="project">Project *</Label>
              <Select
                value={formData.project_id?.toString() || ''}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, project_id: parseInt(value) }))
                }
                disabled={!!role}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Role Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Teacher, Exam Coordinator"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Brief description of this role"
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label>Permissions (grouped by menu)</Label>
              <div className="rounded-md border p-2 max-h-[300px] overflow-y-auto">
                <PermissionsByMenu
                  projectId={formData.project_id || undefined}
                  selectedPermissions={formData.permissions}
                  onPermissionToggle={handlePermissionToggle}
                  onCategoryToggle={handleCategoryToggle}
                  isSuperAdmin={true}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t mt-auto flex-shrink-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || !formData.project_id}>
              {mutation.isPending ? 'Saving...' : role ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminRolesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all projects
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: () => api.get<Project[]>('/projects'),
    enabled: user?.is_super_admin,
  });

  // Fetch all roles
  const { data: rolesApiData, isLoading: rolesLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const response = await api.get<RoleApiResponse[]>('/roles/all');
      return response.map(mapApiRoleToRole);
    },
    enabled: user?.is_super_admin,
  });

  const isLoading = projectsLoading || rolesLoading;

  const deleteMutation = useMutation({
    mutationFn: (role: Role) => api.delete(`/roles/admin/${role.id}?project_id=${role.project_id}`),
    onSuccess: () => {
      toast.success('Role deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
    },
    onError: () => {
      toast.error('Failed to delete role');
    },
  });

  // Deduplicate projects by ID (API may return same project multiple times with different roles)
  const projects = (projectsData || []).filter(
    (project, index, self) => self.findIndex((p) => p.id === project.id) === index
  );
  const roles = rolesApiData || [];

  const filteredRoles = roles.filter((role) => {
    const matchesSearch =
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject =
      projectFilter === 'all' || role.project_id.toString() === projectFilter;
    return matchesSearch && matchesProject;
  });

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingRole(undefined);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingRole(undefined);
  };

  const handleDeleteClick = (role: Role) => {
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (roleToDelete) {
      deleteMutation.mutate(roleToDelete);
    }
  };

  const getProjectName = (projectId: number) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || 'Unknown';
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Roles Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage roles and permissions across all projects
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Role
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Roles Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="p-12 text-center">
                <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Roles Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || projectFilter !== 'all'
                    ? 'No roles match your search criteria'
                    : 'Get started by creating your first role'}
                </p>
                {!searchQuery && projectFilter === 'all' && (
                  <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Role
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Shield className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{role.name}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {role.description || 'No description'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{role.project_name || getProjectName(role.project_id)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {role.permissions.slice(0, 3).map((permission) => (
                            <Badge key={permission} variant="secondary" className="text-xs">
                              {permission.split(':')[1]}
                            </Badge>
                          ))}
                          {role.permissions.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{role.permissions.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(role.created_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(role)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteClick(role)}
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
      <RoleDialog
        role={editingRole}
        projects={projects}
        open={dialogOpen}
        onClose={handleDialogClose}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{roleToDelete?.name}&quot;? This will remove
              this role from all users who have it assigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Role'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
