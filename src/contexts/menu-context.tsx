'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { useProject } from './project-context';
import { useAuth } from './auth-context';
import type { MenuScreenWithPermissions, ProjectMenuAllocation } from '@/types';

interface MenuContextType {
  allocatedMenus: MenuScreenWithPermissions[];
  isLoading: boolean;
  error: string | null;
  refreshMenus: () => Promise<void>;
  isMenuAllocated: (menuName: string) => boolean;
  getMenuByRoute: (route: string) => MenuScreenWithPermissions | null;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

interface MenuProviderProps {
  children: ReactNode;
}

export function MenuProvider({ children }: MenuProviderProps) {
  const { project } = useProject();
  const { user } = useAuth();
  const [allocatedMenus, setAllocatedMenus] = useState<MenuScreenWithPermissions[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMenus = useCallback(async () => {
    if (!project?.id || !user) {
      setAllocatedMenus([]);
      return;
    }

    // Super admins don't need menu restrictions for admin pages
    // but we still fetch for when they view project-level pages
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.get<ProjectMenuAllocation>('/menu-screens/current');
      setAllocatedMenus(data.allocated_menus || []);
    } catch (err) {
      console.error('Failed to fetch allocated menus:', err);
      setError('Failed to load menu configuration');
      // On error, allow all menus (graceful degradation)
      setAllocatedMenus([]);
    } finally {
      setIsLoading(false);
    }
  }, [project?.id, user]);

  // Fetch menus when project or user changes
  useEffect(() => {
    if (project?.id && user) {
      fetchMenus();
    } else {
      setAllocatedMenus([]);
    }
  }, [project?.id, user, fetchMenus]);

  const refreshMenus = useCallback(async () => {
    await fetchMenus();
  }, [fetchMenus]);

  const isMenuAllocated = useCallback((menuName: string): boolean => {
    // Dashboard is always allocated
    if (menuName.toLowerCase() === 'dashboard') {
      return true;
    }
    // If still loading, hide menus until we know what's allocated
    // This prevents showing all menus during loading state
    if (isLoading) {
      return false;
    }
    // If no menus allocated (empty result), don't show any menus
    if (allocatedMenus.length === 0) {
      return false;
    }
    return allocatedMenus.some(
      menu => menu.name.toLowerCase() === menuName.toLowerCase()
    );
  }, [allocatedMenus, isLoading]);

  const getMenuByRoute = useCallback((route: string): MenuScreenWithPermissions | null => {
    return allocatedMenus.find(menu => menu.route === route) || null;
  }, [allocatedMenus]);

  const value: MenuContextType = {
    allocatedMenus,
    isLoading,
    error,
    refreshMenus,
    isMenuAllocated,
    getMenuByRoute,
  };

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
}
