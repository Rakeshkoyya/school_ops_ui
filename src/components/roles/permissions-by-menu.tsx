'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Lock, Unlock } from 'lucide-react';
import type { AvailablePermissionsResponse, MenuPermissionGroup, PermissionDetail } from '@/types';

interface PermissionsByMenuProps {
  projectId?: number;
  selectedPermissions: string[];
  onPermissionToggle: (permissionKey: string) => void;
  onCategoryToggle?: (permissions: string[]) => void;
  isSuperAdmin?: boolean;
  disabled?: boolean;
}

export function PermissionsByMenu({
  projectId,
  selectedPermissions,
  onPermissionToggle,
  onCategoryToggle,
  isSuperAdmin = false,
  disabled = false,
}: PermissionsByMenuProps) {
  // Fetch available permissions grouped by menu
  const { data, isLoading, isError } = useQuery({
    queryKey: ['available-permissions', projectId],
    queryFn: () => {
      if (isSuperAdmin && projectId) {
        return api.get<AvailablePermissionsResponse>(`/menu-screens/project/${projectId}/permissions`);
      }
      return api.get<AvailablePermissionsResponse>('/menu-screens/current/permissions');
    },
    enabled: isSuperAdmin ? !!projectId : true,
  });

  // Check if a permission is selected
  const isPermissionSelected = (permKey: string) => selectedPermissions.includes(permKey);

  // Check if all permissions in a category are selected
  const isCategoryFullySelected = (group: MenuPermissionGroup) => {
    if (group.permissions.length === 0) return false;
    return group.permissions.every((p) => selectedPermissions.includes(p.permission_key));
  };

  // Check if some (but not all) permissions in a category are selected
  const isCategoryPartiallySelected = (group: MenuPermissionGroup) => {
    const selectedCount = group.permissions.filter((p) => selectedPermissions.includes(p.permission_key)).length;
    return selectedCount > 0 && selectedCount < group.permissions.length;
  };

  // Handle toggling all permissions in a category
  const handleCategoryToggle = (group: MenuPermissionGroup) => {
    if (!group.is_allocated || disabled) return;
    
    const categoryPermissions = group.permissions.map((p) => p.permission_key);
    if (onCategoryToggle) {
      onCategoryToggle(categoryPermissions);
    }
  };

  // Format permission label
  const formatPermissionLabel = (permissionKey: string): string => {
    const [resource, action] = permissionKey.split(':');
    const actionLabels: Record<string, string> = {
      view: 'View',
      create: 'Create',
      update: 'Update',
      delete: 'Delete',
      assign: 'Assign',
      upload: 'Upload',
      invite: 'Invite',
      remove: 'Remove',
      create_recurring: 'Create Recurring',
    };
    const resourceLabels: Record<string, string> = {
      task: 'Tasks',
      task_category: 'Task Categories',
      attendance: 'Attendance',
      exam: 'Exams',
      student: 'Students',
      user: 'Users',
      role: 'Roles',
      project: 'Project',
      upload: 'Uploads',
      notification: 'Notifications',
      audit: 'Audit Logs',
    };
    const actionLabel = actionLabels[action] || action;
    return actionLabel;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Failed to load permissions. Please try again.
      </div>
    );
  }

  const menuGroups = data.menu_groups || [];

  if (menuGroups.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No menus allocated to this project.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px] pr-4">
      <Accordion type="multiple" defaultValue={menuGroups.filter(g => g.is_allocated).map(g => g.menu_name)} className="w-full">
        {menuGroups.map((group) => {
          const isAllocated = group.is_allocated;
          const isFullySelected = isCategoryFullySelected(group);
          const isPartiallySelected = isCategoryPartiallySelected(group);

          return (
            <AccordionItem key={group.menu_id} value={group.menu_name}>
              <div className="flex items-center justify-between">
                <AccordionTrigger className="hover:no-underline flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-medium",
                      !isAllocated && "text-muted-foreground"
                    )}>
                      {group.menu_name}
                    </span>
                    {!isAllocated && (
                      <Badge variant="outline" className="text-xs">
                        <Lock className="h-3 w-3 mr-1" />
                        Not Allocated
                      </Badge>
                    )}
                    {isAllocated && group.permissions.length > 0 && (
                      <Badge variant={isFullySelected ? "default" : isPartiallySelected ? "secondary" : "outline"} className="text-xs">
                        {group.permissions.filter(p => selectedPermissions.includes(p.permission_key)).length}/{group.permissions.length}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                {isAllocated && group.permissions.length > 0 && (
                  <div className="flex items-center gap-2 pr-4">
                    <Checkbox
                      checked={isFullySelected}
                      className="data-[state=indeterminate]:bg-primary/50"
                      data-state={isPartiallySelected ? "indeterminate" : isFullySelected ? "checked" : "unchecked"}
                      onCheckedChange={() => handleCategoryToggle(group)}
                      disabled={!isAllocated || disabled}
                    />
                  </div>
                )}
              </div>
              <AccordionContent>
                {!isAllocated ? (
                  <div className="text-sm text-muted-foreground py-2 px-4 italic">
                    This menu is not allocated to the project. Contact a super admin to enable it.
                  </div>
                ) : group.permissions.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-2 px-4">
                    This menu has no configurable permissions.
                  </div>
                ) : (
                  <div className="grid gap-2 py-2 px-4">
                    {group.permissions.map((perm) => (
                      <div key={perm.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`perm-${perm.id}`}
                          checked={isPermissionSelected(perm.permission_key)}
                          onCheckedChange={() => onPermissionToggle(perm.permission_key)}
                          disabled={disabled}
                        />
                        <Label
                          htmlFor={`perm-${perm.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {formatPermissionLabel(perm.permission_key)}
                          <span className="text-xs text-muted-foreground ml-2">
                            ({perm.permission_key})
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </ScrollArea>
  );
}

// Helper to join class names
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
