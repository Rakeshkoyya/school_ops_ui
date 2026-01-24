'use client';

import { useEffect, useState, ReactNode, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useProject } from '@/contexts/project-context';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
}

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/auth/login', '/auth/forgot-password', '/auth/reset-password'];

// Routes that don't require project selection
const NO_PROJECT_ROUTES = ['/select-project', '/auth/login', '/auth/forgot-password', '/auth/reset-password', '/admin'];

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, projects, userRoles, user, setActivePermissions } = useAuth();
  const { isProjectSelected, project } = useProject();
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);
  const lastProjectKey = useRef<string | null>(null);

  // Update permissions when project/role changes
  useEffect(() => {
    if (isAuthenticated && project) {
      const currentKey = `${project.id}-${project.role_id}`;
      if (currentKey !== lastProjectKey.current) {
        lastProjectKey.current = currentKey;
        // Find the matching role from the userRoles array to get fresh permissions
        const matchingRole = userRoles.find(
          (r) => r.project_id === project.id && r.role_id === project.role_id
        );
        if (matchingRole && matchingRole.permissions) {
          setActivePermissions(matchingRole.permissions);
        }
      }
    }
  }, [isAuthenticated, project, userRoles, setActivePermissions]);

  useEffect(() => {
    // Don't do anything while still loading auth state
    if (isLoading) {
      return;
    }

    const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
    const isAdminRoute = pathname.startsWith('/admin');
    const requiresProject = !NO_PROJECT_ROUTES.some((route) => pathname.startsWith(route));
    const projectCount = projects?.length ?? 0;
    const isSuperAdmin = user?.is_super_admin ?? false;

    // Redirect unauthenticated users to login
    if (!isAuthenticated && !isPublicRoute) {
      router.replace('/auth/login');
      return;
    }

    // Redirect authenticated users away from auth pages
    if (isAuthenticated && isPublicRoute) {
      // Super admin can go directly to dashboard (admin mode)
      if (isSuperAdmin) {
        router.replace('/dashboard');
      } else if (projectCount > 1 && !isProjectSelected) {
        router.replace('/select-project');
      } else {
        router.replace('/dashboard');
      }
      return;
    }

    // Admin routes require super admin access
    if (isAuthenticated && isAdminRoute && !isSuperAdmin) {
      router.replace('/forbidden');
      return;
    }

    // Redirect to project selector if needed (only for non-super-admin multi-project users without selection)
    // Super admins can access dashboard without selecting a project
    if (isAuthenticated && requiresProject && projectCount > 1 && !isProjectSelected && !isSuperAdmin) {
      router.replace('/select-project');
      return;
    }

    // All checks passed, mark as ready to render
    setIsReady(true);
  }, [isAuthenticated, isLoading, isProjectSelected, pathname, projects, router, user]);

  // Show loading state while auth is loading
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // For public routes, render immediately
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  if (isPublicRoute && !isAuthenticated) {
    return <>{children}</>;
  }

  // For authenticated routes, wait until ready
  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
