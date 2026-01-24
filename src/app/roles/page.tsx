'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout';
import { api } from '@/lib/api-client';
import { useProject } from '@/contexts/project-context';
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
  DialogTrigger,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Search,
  Shield,
  Edit,
  Trash2,
  MoreHorizontal,
  Check,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Role, PaginatedResponse, Permission } from '@/types';
import { toast } from 'sonner';

// All available permissions
const allPermissions: { category: string; permissions: { key: Permission; label: string }[] }[] = [
  {
    category: 'Tasks',
    permissions: [
      { key: 'task:view', label: 'View Tasks' },
      { key: 'task:create', label: 'Create Tasks' },
      { key: 'task:assign', label: 'Assign Tasks' },
      { key: 'task:update', label: 'Update Tasks' },
      { key: 'task:delete', label: 'Delete Tasks' },
    ],
  },
  {
    category: 'Task Categories',
    permissions: [
      { key: 'task_category:view', label: 'View Categories' },
      { key: 'task_category:create', label: 'Create Categories' },
      { key: 'task_category:update', label: 'Update Categories' },
      { key: 'task_category:delete', label: 'Delete Categories' },
    ],
  },
  {
    category: 'Attendance',
    permissions: [
      { key: 'attendance:view', label: 'View Attendance' },
      { key: 'attendance:create', label: 'Create Attendance' },
      { key: 'attendance:update', label: 'Update Attendance' },
      { key: 'attendance:delete', label: 'Delete Attendance' },
      { key: 'attendance:upload', label: 'Upload Attendance' },
    ],
  },
  {
    category: 'Exams',
    permissions: [
      { key: 'exam:view', label: 'View Exams' },
      { key: 'exam:create', label: 'Create Exams' },
      { key: 'exam:update', label: 'Update Exams' },
      { key: 'exam:delete', label: 'Delete Exams' },
      { key: 'exam:upload', label: 'Upload Exams' },
    ],
  },
  {
    category: 'Uploads',
    permissions: [
      { key: 'upload:view', label: 'View Uploads' },
      { key: 'upload:create', label: 'Create Uploads' },
    ],
  },
  {
    category: 'Roles',
    permissions: [
      { key: 'role:view', label: 'View Roles' },
      { key: 'role:create', label: 'Create Roles' },
      { key: 'role:update', label: 'Update Roles' },
      { key: 'role:delete', label: 'Delete Roles' },
      { key: 'role:assign', label: 'Assign Roles' },
    ],
  },
  {
    category: 'Users',
    permissions: [
      { key: 'user:view', label: 'View Users' },
      { key: 'user:invite', label: 'Invite Users' },
      { key: 'user:remove', label: 'Remove Users' },
    ],
  },
  {
    category: 'Administration',
    permissions: [
      { key: 'audit:view', label: 'View Audit Logs' },
      { key: 'project:view', label: 'View Project' },
      { key: 'project:update', label: 'Update Project Settings' },
      { key: 'notification:view', label: 'View Notifications' },
      { key: 'notification:create', label: 'Create Notifications' },
    ],
  },
];

// Create/Edit Role Dialog
function RoleDialog({
  role,
  onClose,
}: {
  role?: Role;
  onClose: () => void;
}) {
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(role?.permissions || []);
  const { project } = useProject();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: { name: string; description: string; permissions: string[] }) =>
      role
        ? api.patch(`/roles/${role.id}`, data)
        : api.post('/roles', data),
    onSuccess: () => {
      toast.success(role ? 'Role updated successfully' : 'Role created successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      onClose();
    },
    onError: () => {
      toast.error(role ? 'Failed to update role' : 'Failed to create role');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ name, description, permissions: selectedPermissions });
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const toggleCategory = (category: { permissions: { key: string }[] }) => {
    const categoryPermissions = category.permissions.map((p) => p.key);
    const allSelected = categoryPermissions.every((p) => selectedPermissions.includes(p));
    
    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((p) => !categoryPermissions.includes(p)));
    } else {
      setSelectedPermissions((prev) => [...new Set([...prev, ...categoryPermissions])]);
    }
  };

  return (
    <DialogContent className="sm:max-w-[600px]">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>{role ? 'Edit Role' : 'Create New Role'}</DialogTitle>
          <DialogDescription>
            {role ? 'Update role details and permissions' : 'Define a new role with specific permissions'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Role Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Teacher, Exam Coordinator"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this role"
              rows={2}
            />
          </div>
          <div className="grid gap-2">
            <Label>Permissions</Label>
            <ScrollArea className="h-[300px] rounded-md border p-4">
              <div className="space-y-6">
                {allPermissions.map((category) => {
                  const categoryPermissions = category.permissions.map((p) => p.key);
                  const allSelected = categoryPermissions.every((p) =>
                    selectedPermissions.includes(p)
                  );
                  const someSelected =
                    categoryPermissions.some((p) => selectedPermissions.includes(p)) &&
                    !allSelected;

                  return (
                    <div key={category.category} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={category.category}
                          checked={allSelected}
                          ref={(el) => {
                            if (el) {
                              (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected;
                            }
                          }}
                          onCheckedChange={() => toggleCategory(category)}
                        />
                        <Label htmlFor={category.category} className="font-semibold cursor-pointer">
                          {category.category}
                        </Label>
                      </div>
                      <div className="ml-6 grid gap-2">
                        {category.permissions.map((permission) => (
                          <div key={permission.key} className="flex items-center gap-2">
                            <Checkbox
                              id={permission.key}
                              checked={selectedPermissions.includes(permission.key)}
                              onCheckedChange={() => togglePermission(permission.key)}
                            />
                            <Label htmlFor={permission.key} className="font-normal cursor-pointer">
                              {permission.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : role ? 'Update Role' : 'Create Role'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export default function RolesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | undefined>();
  const { project } = useProject();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['roles', project?.id],
    queryFn: () => api.get<PaginatedResponse<Role>>('/roles'),
    enabled: !!project?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (roleId: number) => api.delete(`/roles/${roleId}`),
    onSuccess: () => {
      toast.success('Role deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: () => {
      toast.error('Failed to delete role');
    },
  });

  // Mock data for development
  const mockRoles: Role[] = [
    {
      id: 1,
      name: 'Administrator',
      description: 'Full access to all features and settings',
      permissions: [
        'task:view', 'task:create', 'task:assign', 'task:update', 'task:delete',
        'attendance:view', 'attendance:upload',
        'exam:view', 'exam:upload',
        'upload:view',
        'role:view', 'user:view', 'audit:view', 'project:update',
      ],
      project_id: 1,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 2,
      name: 'Teacher',
      description: 'Can manage attendance and view tasks',
      permissions: ['task:view', 'task:create', 'attendance:view', 'attendance:upload'],
      project_id: 1,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 3,
      name: 'Exam Coordinator',
      description: 'Can manage exam results and view uploads',
      permissions: ['task:view', 'exam:view', 'exam:upload', 'upload:view'],
      project_id: 1,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 4,
      name: 'Office Staff',
      description: 'Basic access to tasks and uploads',
      permissions: ['task:view', 'upload:view'],
      project_id: 1,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ];

  const roles = data?.items || mockRoles;

  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Roles</h1>
            <p className="text-muted-foreground mt-1">
              Manage roles and their permissions
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create Role
              </Button>
            </DialogTrigger>
            <RoleDialog role={editingRole} onClose={handleDialogClose} />
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Roles Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[200px]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRoles.map((role) => (
              <Card key={role.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{role.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {role.permissions.length} permissions
                        </CardDescription>
                      </div>
                    </div>
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
                          onClick={() => deleteMutation.mutate(role.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{role.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.slice(0, 4).map((permission) => (
                      <Badge key={permission} variant="secondary" className="text-xs">
                        {permission.split('.')[1]}
                      </Badge>
                    ))}
                    {role.permissions.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{role.permissions.length - 4} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
