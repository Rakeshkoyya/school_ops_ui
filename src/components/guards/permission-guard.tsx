'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';

interface PermissionGuardProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showLoader?: boolean;
}

/**
 * PermissionGuard - A component to conditionally render content based on user permissions
 * 
 * @param permission - Single permission required
 * @param permissions - Array of permissions (used with requireAll)
 * @param requireAll - If true, all permissions must be present; if false, any one is sufficient
 * @param fallback - Content to show when permission check fails (defaults to null)
 * @param showLoader - Show skeleton while auth is loading
 */
export function PermissionGuard({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  showLoader = false,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = useAuth();

  if (isLoading && showLoader) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll 
      ? hasAllPermissions(permissions) 
      : hasAnyPermission(permissions);
  } else {
    // No permission specified, allow access
    hasAccess = true;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * usePermissionCheck - A hook to check permissions programmatically
 */
export function usePermissionCheck() {
  const { hasPermission, hasAnyPermission, hasAllPermissions, permissions } = useAuth();

  return {
    check: hasPermission,
    checkAny: hasAnyPermission,
    checkAll: hasAllPermissions,
    permissions,
  };
}
