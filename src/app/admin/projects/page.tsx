'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout';
import { api } from '@/lib/api-client';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Search,
  FolderKanban,
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
import type { Project } from '@/types';
import { format, isValid, parseISO } from 'date-fns';
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

interface ProjectFormData {
  name: string;
  slug: string;
  description: string;
  theme_color: string;
  logo_url: string;
  status: 'active' | 'suspended';
  add_default_roles: boolean;
}

// Create/Edit Project Dialog
function ProjectDialog({
  project,
  open,
  onClose,
  onProjectCreated,
}: {
  project?: Project;
  open: boolean;
  onClose: () => void;
  onProjectCreated?: () => void;
}) {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: project?.name || '',
    slug: project?.slug || '',
    description: project?.description || '',
    theme_color: project?.theme_color || '#3b82f6',
    logo_url: project?.logo_url || '',
    status: (project?.status as 'active' | 'suspended') || 'active',
    add_default_roles: true,
  });
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: ProjectFormData) => {
      if (project) {
        // For updates, send all fields except add_default_roles
        const { add_default_roles, ...updateData } = data;
        return api.patch<Project>(`/projects/${project.id}`, updateData);
      } else {
        // For creation, exclude status (it's set by backend) but include add_default_roles
        const { status, ...createData } = data;
        return api.post<Project>('/projects', createData);
      }
    },
    onSuccess: () => {
      toast.success(project ? 'Project updated successfully' : 'Project created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      // Refresh auth to update user's project list in the dropdown
      if (!project && onProjectCreated) {
        onProjectCreated();
      }
      onClose();
    },
    onError: (error: unknown) => {
      console.error('Project mutation error:', error);
      const errorMessage = (error as { response?: { data?: { error?: { message?: string; details?: unknown } } } })?.response?.data?.error?.message || 'Unknown error';
      const errorDetails = (error as { response?: { data?: { error?: { details?: unknown } } } })?.response?.data?.error?.details;
      console.error('Error details:', errorDetails);
      toast.error(project ? `Failed to update project: ${errorMessage}` : `Failed to create project: ${errorMessage}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      // Only auto-generate slug if it's a new project or slug is empty
      slug: !project && !prev.slug ? generateSlug(name) : prev.slug,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{project ? 'Edit Project' : 'Create New Project'}</DialogTitle>
            <DialogDescription>
              {project ? 'Update project details' : 'Add a new school/project to the system'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Springfield Elementary"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, slug: e.target.value }))
                }
                placeholder="e.g., springfield-elementary"
                pattern="^[a-z0-9-]+$"
                disabled={!!project}
                required
              />
              <p className="text-xs text-muted-foreground">
                URL-friendly identifier (lowercase letters, numbers, hyphens only)
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Brief description of the project"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="theme_color">Theme Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="theme_color"
                    type="color"
                    value={formData.theme_color}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, theme_color: e.target.value }))
                    }
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={formData.theme_color}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, theme_color: e.target.value }))
                    }
                    placeholder="#3b82f6"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'active' | 'suspended') =>
                    setFormData((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                value={formData.logo_url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, logo_url: e.target.value }))
                }
                placeholder="https://example.com/logo.png"
                type="url"
              />
            </div>
            {/* Only show checkbox for new projects */}
            {!project && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add_default_roles"
                  checked={formData.add_default_roles}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, add_default_roles: checked === true }))
                  }
                />
                <Label htmlFor="add_default_roles" className="text-sm font-normal cursor-pointer">
                  Add default roles (School Admin and Staff)
                </Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const { user, refreshAuth } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all projects (super admin only)
  const { data, isLoading } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: () => api.get<Project[]>('/projects'),
    enabled: user?.is_super_admin,
  });

  const deleteMutation = useMutation({
    mutationFn: (projectId: number) => api.delete(`/projects/${projectId}`),
    onSuccess: () => {
      toast.success('Project deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    },
    onError: () => {
      toast.error('Failed to delete project');
    },
  });

  // Mock data for development
  const mockProjects: Project[] = [
    {
      id: 1,
      name: 'Springfield Elementary',
      slug: 'springfield-elementary',
      description: 'Main elementary school in Springfield',
      theme_color: '#3b82f6',
      logo_url: '',
      status: 'active',
      created_at: '2025-09-01T00:00:00Z',
      updated_at: '2026-01-15T00:00:00Z',
    },
    {
      id: 2,
      name: 'Shelbyville High',
      slug: 'shelbyville-high',
      description: 'High school in Shelbyville',
      theme_color: '#10b981',
      logo_url: '',
      status: 'active',
      created_at: '2025-10-01T00:00:00Z',
      updated_at: '2026-01-10T00:00:00Z',
    },
    {
      id: 3,
      name: 'Capital City Academy',
      slug: 'capital-city-academy',
      description: 'Private academy in Capital City',
      theme_color: '#f59e0b',
      logo_url: '',
      status: 'suspended',
      created_at: '2025-11-01T00:00:00Z',
      updated_at: '2026-01-12T00:00:00Z',
    },
  ];

  // Deduplicate projects by id to prevent React key warnings
  const rawProjects = data || mockProjects;
  const projects = Array.from(
    new Map(rawProjects.map((p) => [p.id, p])).values()
  );

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingProject(undefined);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingProject(undefined);
  };

  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (projectToDelete) {
      deleteMutation.mutate(projectToDelete.id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage all schools and projects in the system
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </div>

        {/* Search and Stats */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Total: {projects.length}</span>
            <span>Active: {projects.filter((p) => p.status === 'active').length}</span>
            <span>Suspended: {projects.filter((p) => p.status === 'suspended').length}</span>
          </div>
        </div>

        {/* Projects Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="p-12 text-center">
                <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Projects Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? 'No projects match your search criteria'
                    : 'Get started by creating your first project'}
                </p>
                {!searchQuery && (
                  <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Project
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${project.theme_color || '#3b82f6'}20` }}
                          >
                            <Building2
                              className="h-5 w-5"
                              style={{ color: project.theme_color || '#3b82f6' }}
                            />
                          </div>
                          <div>
                            <p className="font-medium">{project.name}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {project.description || 'No description'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {project.slug}
                        </code>
                      </TableCell>
                      <TableCell>{getStatusBadge(project.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(project.created_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(project.updated_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(project)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteClick(project)}
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
      <ProjectDialog
        project={editingProject}
        open={dialogOpen}
        onClose={handleDialogClose}
        onProjectCreated={refreshAuth}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{projectToDelete?.name}&quot;? This action
              cannot be undone and will remove all associated data including users, roles,
              and records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Project'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
