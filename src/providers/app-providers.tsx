'use client';

import { ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { GoogleOAuthProvider } from './google-oauth-provider';
import { AuthProvider, ProjectProvider, MenuProvider } from '@/contexts';
import { AuthGuard } from '@/components/guards';
import { Toaster } from '@/components/ui/sonner';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <GoogleOAuthProvider>
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
      </GoogleOAuthProvider>
    </QueryProvider>
  );
}
