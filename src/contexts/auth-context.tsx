'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api, setAccessToken, clearAccessToken, getAccessToken, setCurrentProjectId } from '@/lib/api-client';
import type { User, ProjectInfo, UserRoleInfo, ProjectWithRole, AuthMeResponse } from '@/types';

// Helper to combine ProjectInfo and UserRoleInfo into ProjectWithRole for easier frontend use
function combineProjectAndRole(project: ProjectInfo, role: UserRoleInfo): ProjectWithRole {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description,
    theme_color: project.theme_color,
    logo_url: project.logo_url,
    status: project.status,
    role_id: role.role_id,
    role_name: role.role_name,
    is_project_admin: role.is_project_admin,
    is_role_admin: role.is_role_admin,
    permissions: role.permissions,
  };
}

interface AuthContextType {
  user: User | null;
  projects: ProjectInfo[];  // Unique projects
  userRoles: UserRoleInfo[];  // All role assignments
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<{ user: User; projects: ProjectInfo[]; userRoles: UserRoleInfo[]; permissions: string[] } | null>;
  setActivePermissions: (permissions: string[]) => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  // Helper methods
  getProjectRoles: (projectId: number) => UserRoleInfo[];
  getProjectWithRole: (projectId: number, roleId: number) => ProjectWithRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [userRoles, setUserRoles] = useState<UserRoleInfo[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);
  const router = useRouter();

  const refreshAuth = useCallback(async (): Promise<{ user: User; projects: ProjectInfo[]; userRoles: UserRoleInfo[]; permissions: string[] } | null> => {
    try {
      const token = getAccessToken();
      if (!token) {
        setUser(null);
        setProjects([]);
        setUserRoles([]);
        setPermissions([]);
        return null;
      }

      const data = await api.get<AuthMeResponse>('/auth/me');
      setUser(data.user);
      setProjects(data.projects || []);
      setUserRoles(data.user_roles || []);
      
      // Check if there's a stored project/role and use its permissions
      let activePermissions = data.permissions || [];
      if (typeof window !== 'undefined') {
        const storedProject = localStorage.getItem('current_project');
        if (storedProject) {
          try {
            const parsed = JSON.parse(storedProject);
            // Find the matching role from the fresh data
            const matchingRole = (data.user_roles || []).find(
              (r) => r.project_id === parsed.id && r.role_id === parsed.role_id
            );
            if (matchingRole && matchingRole.permissions) {
              activePermissions = matchingRole.permissions;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
      
      setPermissions(activePermissions);
      return { 
        user: data.user, 
        projects: data.projects || [], 
        userRoles: data.user_roles || [],
        permissions: activePermissions 
      };
    } catch (error) {
      clearAccessToken();
      setUser(null);
      setProjects([]);
      setUserRoles([]);
      setPermissions([]);
      return null;
    } finally {
      isInitialized.current = true;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = async (username: string, password: string) => {
    const response = await api.post<{ access_token: string; refresh_token: string; token_type: string; expires_in: number }>('/auth/login', {
      username,
      password,
    });

    setAccessToken(response.access_token);

    // Fetch full auth data
    const authData = await refreshAuth();

    // Navigate based on projects
    const userProjects = authData?.projects ?? [];
    const roles = authData?.userRoles ?? [];
    
    if (userProjects.length === 1 && roles.length === 1) {
      // Auto-select the only project/role
      const project = userProjects[0];
      const role = roles[0];
      const combined = combineProjectAndRole(project, role);
      
      setCurrentProjectId(project.id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('current_project', JSON.stringify(combined));
      }
      if (role.permissions) {
        setPermissions(role.permissions);
      }
      router.push('/dashboard');
    } else if (userProjects.length >= 1) {
      router.push('/select-project');
    } else {
      router.push('/dashboard');
    }
  };

  const logout = useCallback(() => {
    clearAccessToken();
    setUser(null);
    setProjects([]);
    setUserRoles([]);
    setPermissions([]);
    router.push('/auth/login');
  }, [router]);

  // Allow setting active permissions when project/role is switched
  const setActivePermissions = useCallback((newPermissions: string[]) => {
    setPermissions(newPermissions);
  }, []);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      return Array.isArray(permissions) && permissions.includes(permission);
    },
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (perms: string[]): boolean => {
      return Array.isArray(permissions) && perms.some((p) => permissions.includes(p));
    },
    [permissions]
  );

  const hasAllPermissions = useCallback(
    (perms: string[]): boolean => {
      return Array.isArray(permissions) && perms.every((p) => permissions.includes(p));
    },
    [permissions]
  );

  // Get all roles for a specific project
  const getProjectRoles = useCallback(
    (projectId: number): UserRoleInfo[] => {
      return userRoles.filter((r) => r.project_id === projectId);
    },
    [userRoles]
  );

  // Get combined project+role object
  const getProjectWithRole = useCallback(
    (projectId: number, roleId: number): ProjectWithRole | null => {
      const project = projects.find((p) => p.id === projectId);
      const role = userRoles.find((r) => r.project_id === projectId && r.role_id === roleId);
      if (project && role) {
        return combineProjectAndRole(project, role);
      }
      return null;
    },
    [projects, userRoles]
  );

  const value: AuthContextType = {
    user,
    projects: projects ?? [],
    userRoles: userRoles ?? [],
    permissions: permissions ?? [],
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshAuth,
    setActivePermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getProjectRoles,
    getProjectWithRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
