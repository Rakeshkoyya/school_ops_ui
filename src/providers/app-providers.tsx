'use client';

import { ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { AuthProvider, ProjectProvider, MenuProvider } from '@/contexts';
import { AuthGuard } from '@/components/guards';
import { Toaster } from '@/components/ui/sonner';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider>
        <ProjectProvider>
          <MenuProvider>
            <AuthGuard>
              {children}
            </AuthGuard>
            <Toaster position="top-right" richColors closeButton />
          </MenuProvider>
        </ProjectProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
