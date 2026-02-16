'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { setCurrentProjectId, getCurrentProjectId, clearCurrentProjectId } from '@/lib/api-client';
import type { ProjectWithRole } from '@/types';

interface ProjectContextType {
  project: ProjectWithRole | null;
  setProject: (project: ProjectWithRole) => void;
  clearProject: () => void;
  isProjectSelected: boolean;
  isProjectAdmin: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const [project, setProjectState] = useState<ProjectWithRole | null>(() => {
    // Initialize from localStorage if available (SSR-safe)
    if (typeof window !== 'undefined') {
      const storedProject = localStorage.getItem('current_project');
      if (storedProject) {
        try {
          return JSON.parse(storedProject);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  // Sync project from localStorage on mount (for hydration)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedProject = localStorage.getItem('current_project');
      if (storedProject && !project) {
        try {
          const parsed = JSON.parse(storedProject);
          setProjectState(parsed);
          // Ensure api-client's currentProjectId is synced
          setCurrentProjectId(parsed.id);
        } catch {
          // Invalid stored project, clear it
          clearCurrentProjectId();
          localStorage.removeItem('current_project');
        }
      } else if (project) {
        // Ensure api-client is synced with current project state
        setCurrentProjectId(project.id);
      }
    }
  }, [project]);

  // Listen for storage changes (e.g., when logout clears project data)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'current_project') {
        if (e.newValue === null) {
          // Project was cleared (e.g., on logout)
          setProjectState(null);
        } else {
          // Project was changed
          try {
            const parsed = JSON.parse(e.newValue);
            setProjectState(parsed);
          } catch {
            setProjectState(null);
          }
        }
      }
    };

    // Handle custom event for same-tab notifications (e.g., logout)
    const handleProjectCleared = () => {
      setProjectState(null);
    };

    // Handle custom event for when a project is selected (e.g., on login auto-select)
    const handleProjectSelected = (e: Event) => {
      const customEvent = e as CustomEvent<ProjectWithRole>;
      if (customEvent.detail) {
        setProjectState(customEvent.detail);
        setCurrentProjectId(customEvent.detail.id);
        localStorage.setItem('current_project', JSON.stringify(customEvent.detail));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('project-cleared', handleProjectCleared);
    window.addEventListener('project-selected', handleProjectSelected);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('project-cleared', handleProjectCleared);
      window.removeEventListener('project-selected', handleProjectSelected);
    };
  }, []);

  const setProject = useCallback((newProject: ProjectWithRole) => {
    setProjectState(newProject);
    setCurrentProjectId(newProject.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('current_project', JSON.stringify(newProject));
    }
  }, []);

  const clearProject = useCallback(() => {
    setProjectState(null);
    clearCurrentProjectId();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('current_project');
    }
  }, []);

  const value: ProjectContextType = {
    project,
    setProject,
    clearProject,
    isProjectSelected: !!project,
    isProjectAdmin: project?.is_project_admin ?? false,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
