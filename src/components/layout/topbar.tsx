'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useProject } from '@/contexts/project-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bell, ChevronDown, LogOut, Settings, User, Building2, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import type { UserRoleInfo } from '@/types';
import { normalizeRoleName } from '@/types';

interface TopBarProps {
  sidebarCollapsed: boolean;
}

export function TopBar({ sidebarCollapsed }: TopBarProps) {
  const { user, logout, projects, userRoles, setActivePermissions, getProjectWithRole } = useAuth();
  const { project, setProject } = useProject();
  const router = useRouter();

  // Get roles for the currently selected project
  const availableRolesForProject = useMemo(() => {
    if (!project) return [];
    return userRoles.filter((r) => r.project_id === project.id);
  }, [project, userRoles]);

  const handleProjectChange = async (projectId: string) => {
    const projectIdNum = parseInt(projectId);
    // Get the first role for this project as default
    const projectRole = userRoles.find((r) => r.project_id === projectIdNum);
    if (projectRole) {
      const combined = getProjectWithRole(projectIdNum, projectRole.role_id);
      if (combined) {
        setProject(combined);
        if (projectRole.permissions) {
          setActivePermissions(projectRole.permissions);
        }
        router.push('/dashboard');
      }
    }
  };

  const handleRoleChange = async (roleKey: string) => {
    // roleKey format: "projectId-roleId"
    const [projectIdStr, roleIdStr] = roleKey.split('-');
    const projectId = parseInt(projectIdStr);
    const roleId = parseInt(roleIdStr);
    
    const combined = getProjectWithRole(projectId, roleId);
    if (combined) {
      setProject(combined);
      if (combined.permissions) {
        setActivePermissions(combined.permissions);
      }
      router.push('/dashboard');
    }
  };

  // Get role badge color based on role type
  const getRoleBadgeVariant = (roleName: string): 'default' | 'secondary' | 'outline' => {
    const normalized = normalizeRoleName(roleName);
    switch (normalized) {
      case 'Super Admin':
        return 'default';
      case 'School Admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const userInitials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <header
      className={`fixed top-0 right-0 z-30 flex h-16 items-center justify-between border-b bg-card px-6 transition-all duration-300 ${
        sidebarCollapsed ? 'left-16' : 'left-64'
      }`}
    >
      {/* Left side - Page title or breadcrumb area */}
      <div className="flex items-center gap-4">
        {project && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>{project.name}</span>
            {project.role_name && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <Badge variant="outline" className="text-xs">
                  {project.role_name}
                </Badge>
              </>
            )}
          </div>
        )}
        {user?.is_super_admin && !project && (
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-medium">Super Admin Mode</span>
          </div>
        )}
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative" onClick={() => router.push('/notifications')}>
          <Bell className="h-5 w-5" />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
            3
          </Badge>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={undefined} alt={user?.name} />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <span className="hidden md:inline-block text-sm font-medium">
                {user?.name}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            {/* User Name and Email Header */}
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-base font-semibold">{user?.name}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  @{user?.username}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Project and Role Switchers */}
            {projects.length > 0 && (
              <div className="px-2 py-3 space-y-4">
                {/* Project Dropdown */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block font-medium">
                    Project
                  </Label>
                  <Select
                    value={project?.id.toString() || ''}
                    onValueChange={handleProjectChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: p.theme_color || '#3b82f6' }}
                            />
                            <span>{p.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Role Dropdown */}
                {project && availableRolesForProject.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block font-medium">
                      Role
                    </Label>
                    <Select
                      value={`${project.id}-${project.role_id}`}
                      onValueChange={handleRoleChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRolesForProject.map((role) => (
                          <SelectItem
                            key={`${role.project_id}-${role.role_id}`}
                            value={`${role.project_id}-${role.role_id}`}
                          >
                            <div className="flex items-center gap-2">
                              <Shield className="h-3 w-3 text-muted-foreground" />
                              <span>{role.role_name}</span>
                              {role.is_project_admin && (
                                <Badge variant={getRoleBadgeVariant(role.role_name)} className="text-xs py-0 ml-1">
                                  Admin
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Switching roles will change available menu options
                    </p>
                  </div>
                )}
              </div>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
