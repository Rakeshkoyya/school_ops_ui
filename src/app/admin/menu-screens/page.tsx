'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  LayoutList,
  Save,
  Building2,
  Check,
  X,
} from 'lucide-react';
import type { Project, MenuScreenWithPermissions, ProjectMenuAllocation } from '@/types';
import { toast } from 'sonner';

export default function MenuScreensPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedMenuIds, setSelectedMenuIds] = useState<Set<number>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch all projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: () => api.get<Project[]>('/projects/all'),
    enabled: user?.is_super_admin,
  });

  // Fetch all menu screens
  const { data: allMenus = [], isLoading: menusLoading } = useQuery({
    queryKey: ['menu-screens'],
    queryFn: () => api.get<MenuScreenWithPermissions[]>('/menu-screens'),
    enabled: user?.is_super_admin,
  });

  // Fetch allocated menus for selected project
  const { data: projectAllocation, isLoading: allocationLoading } = useQuery({
    queryKey: ['project-menus', selectedProjectId],
    queryFn: () => api.get<ProjectMenuAllocation>(`/menu-screens/project/${selectedProjectId}`),
    enabled: !!selectedProjectId && user?.is_super_admin,
  });

  // Initialize selected menus when project allocation changes
  useEffect(() => {
    if (projectAllocation) {
      setSelectedMenuIds(new Set(projectAllocation.allocated_menus.map(m => m.id)));
      setHasChanges(false);
    }
  }, [projectAllocation]);

  // Save allocation mutation
  const saveMutation = useMutation({
    mutationFn: (menuScreenIds: number[]) =>
      api.put<ProjectMenuAllocation>(`/menu-screens/project/${selectedProjectId}`, {
        menu_screen_ids: menuScreenIds,
      }),
    onSuccess: () => {
      toast.success('Menu screens allocated successfully');
      queryClient.invalidateQueries({ queryKey: ['project-menus', selectedProjectId] });
      setHasChanges(false);
    },
    onError: (error: unknown) => {
      const errorMessage = (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to save';
      toast.error(`Failed to allocate menus: ${errorMessage}`);
    },
  });

  // Filter projects by search
  const filteredProjects = useMemo(() => {
    if (!searchQuery) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(
      p => p.name.toLowerCase().includes(query) || p.slug.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  // Get selected project
  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Handle menu toggle
  const handleMenuToggle = (menuId: number) => {
    const newSelected = new Set(selectedMenuIds);
    if (newSelected.has(menuId)) {
      newSelected.delete(menuId);
    } else {
      newSelected.add(menuId);
    }
    setSelectedMenuIds(newSelected);
    setHasChanges(true);
  };

  // Handle select/deselect all
  const handleSelectAll = () => {
    setSelectedMenuIds(new Set(allMenus.map(m => m.id)));
    setHasChanges(true);
  };

  const handleDeselectAll = () => {
    // Keep Dashboard always selected
    const dashboard = allMenus.find(m => m.name === 'Dashboard');
    setSelectedMenuIds(dashboard ? new Set([dashboard.id]) : new Set());
    setHasChanges(true);
  };

  // Handle save
  const handleSave = () => {
    if (!selectedProjectId) return;
    saveMutation.mutate(Array.from(selectedMenuIds));
  };

  // Handle project selection
  const handleProjectSelect = (projectId: string) => {
    const id = parseInt(projectId, 10);
    setSelectedProjectId(id);
    // Reset selections - will be populated by the query onSuccess
    setSelectedMenuIds(new Set());
    setHasChanges(false);
  };

  if (!user?.is_super_admin) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <p className="text-muted-foreground">Access denied. Super Admin only.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <LayoutList className="h-6 w-6" />
              Menu Screen Allocation
            </h1>
            <p className="text-muted-foreground">
              Allocate sidebar menu screens to projects. Only allocated menus will be visible to project users.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project Selection */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Select Project
              </CardTitle>
              <CardDescription>Choose a project to manage its menu screens</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              <ScrollArea className="h-[400px] rounded-md border">
                {projectsLoading ? (
                  <div className="p-4 space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No projects found
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredProjects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleProjectSelect(project.id.toString())}
                        className={`w-full text-left p-3 rounded-md transition-colors ${
                          selectedProjectId === project.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="font-medium">{project.name}</div>
                        <div className={`text-sm ${
                          selectedProjectId === project.id
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        }`}>
                          {project.slug}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Menu Allocation */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {selectedProject ? (
                      <span className="flex items-center gap-2">
                        Menu Screens for{' '}
                        <Badge variant="outline">{selectedProject.name}</Badge>
                      </span>
                    ) : (
                      'Menu Screens'
                    )}
                  </CardTitle>
                  <CardDescription>
                    {selectedProject
                      ? 'Select which menus should be available in this project'
                      : 'Select a project to manage its menu screens'}
                  </CardDescription>
                </div>
                {selectedProject && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleSelectAll}>
                      <Check className="h-4 w-4 mr-1" />
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                      <X className="h-4 w-4 mr-1" />
                      Deselect All
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={!hasChanges || saveMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedProject ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                  <Building2 className="h-12 w-12 mb-4 opacity-50" />
                  <p>Select a project from the list to manage its menus</p>
                </div>
              ) : menusLoading || allocationLoading ? (
                <div className="space-y-2">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Enabled</TableHead>
                      <TableHead>Menu Screen</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Permissions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allMenus
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((menu) => {
                        const isSelected = selectedMenuIds.has(menu.id);
                        const isDashboard = menu.name === 'Dashboard';
                        return (
                          <TableRow key={menu.id}>
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleMenuToggle(menu.id)}
                                disabled={isDashboard} // Dashboard always enabled
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div>
                                  <div className="font-medium">{menu.name}</div>
                                  {menu.description && (
                                    <div className="text-xs text-muted-foreground">
                                      {menu.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                {menu.route}
                              </code>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {menu.permissions.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">
                                    No permissions
                                  </span>
                                ) : (
                                  menu.permissions.slice(0, 3).map((perm) => (
                                    <Badge key={perm.id} variant="secondary" className="text-xs">
                                      {perm.permission_key}
                                    </Badge>
                                  ))
                                )}
                                {menu.permissions.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{menu.permissions.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
