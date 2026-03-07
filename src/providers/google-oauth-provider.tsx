'use client';

import { ReactNode } from 'react';
import { GoogleOAuthProvider as GoogleProvider } from '@react-oauth/google';

interface GoogleOAuthProviderProps {
  children: ReactNode;
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export function GoogleOAuthProvider({ children }: GoogleOAuthProviderProps) {
  // If no client ID is configured, render children without the provider
  if (!GOOGLE_CLIENT_ID) {
    return <>{children}</>;
  }

  return (
    <GoogleProvider clientId={GOOGLE_CLIENT_ID}>
      {children}
    </GoogleProvider>
  );
}
