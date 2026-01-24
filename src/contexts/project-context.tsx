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
    const projectId = getCurrentProjectId();
    if (projectId && typeof window !== 'undefined') {
      const storedProject = localStorage.getItem('current_project');
      if (storedProject && !project) {
        try {
          const parsed = JSON.parse(storedProject);
          setProjectState(parsed);
        } catch {
          // Invalid stored project, clear it
          clearCurrentProjectId();
          localStorage.removeItem('current_project');
        }
      }
    }
  }, [project]);

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
