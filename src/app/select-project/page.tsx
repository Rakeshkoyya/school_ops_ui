'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useProject } from '@/contexts/project-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Building2, ArrowRight, LogOut } from 'lucide-react';
import type { ProjectInfo, UserRoleInfo
} from '@/types';

export default function SelectProjectPage() {
  const { projects, userRoles, logout, setActivePermissions, getProjectWithRole } = useAuth();
  const { setProject } = useProject();
  const router = useRouter();

  // Create a list of project-role combinations for selection
  const projectRoleCombinations = useMemo(() => {
    return userRoles.map((role) => {
      const project = projects.find((p) => p.id === role.project_id);
      return {
        project,
        role,
      };
    }).filter((item) => item.project !== undefined) as { project: ProjectInfo; role: UserRoleInfo }[];
  }, [projects, userRoles]);

  const handleSelectProjectRole = (project: ProjectInfo, role: UserRoleInfo) => {
    const combined = getProjectWithRole(project.id, role.role_id);
    if (combined) {
      setProject(combined);
      if (role.permissions) {
        setActivePermissions(role.permissions);
      }
      router.push('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckSquare className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Select a Project</h1>
          <p className="text-muted-foreground">
            Choose which project and role you want to work with today
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {projectRoleCombinations.map(({ project, role }) => (
            <Card
              key={`${project.id}-${role.role_id}`}
              className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
              onClick={() => handleSelectProjectRole(project, role)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${project.theme_color || '#3b82f6'}20` }}
                  >
                    <Building2
                      className="h-5 w-5"
                      style={{ color: project.theme_color || '#3b82f6' }}
                    />
                  </div>
                  {project.status !== 'active' && (
                    <Badge variant="secondary">{project.status}</Badge>
                  )}
                </div>
                <CardTitle className="mt-2">{project.name}</CardTitle>
                <CardDescription>
                  <div className="flex items-center gap-2">
                    <span>{project.description || 'No description'}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {role.role_name}
                    {role.is_project_admin && ' (Admin)'}
                  </Badge>
                  <Button variant="ghost" size="sm" className="group">
                    <span>Select</span>
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {projectRoleCombinations.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Projects Available</h3>
              <p className="text-muted-foreground mb-4">
                You don&apos;t have access to any projects yet. Please contact your administrator.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
