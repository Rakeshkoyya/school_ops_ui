'use client';

import { useState, useEffect, ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { TopBar } from './topbar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { ChangePasswordDialog } from '@/components/auth/change-password-dialog';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isFirstLogin } = useAuth();
  const [showFirstLoginDialog, setShowFirstLoginDialog] = useState(false);

  // Show the dialog when isFirstLogin becomes true
  useEffect(() => {
    if (isFirstLogin) {
      setShowFirstLoginDialog(true);
    }
  }, [isFirstLogin]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <TopBar sidebarCollapsed={sidebarCollapsed} />
      <main
        className={cn(
          'min-h-screen pt-16 transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        )}
      >
        <div className="p-6">{children}</div>
      </main>

      {/* First Login Password Change Prompt */}
      <ChangePasswordDialog
        open={showFirstLoginDialog}
        onOpenChange={setShowFirstLoginDialog}
        isFirstLogin={true}
      />
    </div>
  );
}
