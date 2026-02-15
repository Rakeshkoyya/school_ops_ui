'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useProject } from '@/contexts/project-context';
import { useMenu } from '@/contexts/menu-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { normalizeRoleName } from '@/types';
import {
  LayoutDashboard,
  ClipboardList,
  UserCheck,
  GraduationCap,
  Shield,
  Users,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  DollarSign,
  LayoutList,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  permission?: string;
}

// Navigation items for Super Admin role
// Dashboard, Project Management, Menu Screens, Roles Management, Users Management
const superAdminNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: 'Projects',
    href: '/admin/projects',
    icon: <FolderKanban className="h-5 w-5" />,
  },
  {
    label: 'Menu Screens',
    href: '/admin/menu-screens',
    icon: <LayoutList className="h-5 w-5" />,
  },
  {
    label: 'Roles',
    href: '/admin/roles',
    icon: <Shield className="h-5 w-5" />,
  },
  {
    label: 'Users',
    href: '/admin/users',
    icon: <Users className="h-5 w-5" />,
  },
];

// Navigation items for School Admin role
// Dashboard, Task Management, Students, Attendance, Exams, Fee Management, Users, Roles
const schoolAdminNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: 'Users',
    href: '/users',
    icon: <Users className="h-5 w-5" />,
    permission: 'user:view',
  },
  {
    label: 'Students',
    href: '/students',
    icon: <GraduationCap className="h-5 w-5" />,
    permission: 'student:view',
  },
  {
    label: 'Roles',
    href: '/roles',
    icon: <Shield className="h-5 w-5" />,
    permission: 'role:view',
  },
  {
    label: 'Tasks',
    href: '/tasks',
    icon: <ClipboardList className="h-5 w-5" />,
    permission: 'task:view',
  },
  {
    label: 'Attendance',
    href: '/attendance',
    icon: <UserCheck className="h-5 w-5" />,
    permission: 'attendance:view',
  },
  {
    label: 'Exams',
    href: '/exams',
    icon: <GraduationCap className="h-5 w-5" />,
    permission: 'exam:view',
  },
  {
    label: 'Fee Management',
    href: '/fees',
    icon: <DollarSign className="h-5 w-5" />,
    permission: 'fee:view',
  },
];

// Navigation items for Staff/Teacher role
// Dashboard, Users, Students, Roles, Task Management, Attendance, Exams
const staffNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: 'Users',
    href: '/users',
    icon: <Users className="h-5 w-5" />,
    permission: 'user:view',
  },
  {
    label: 'Students',
    href: '/students',
    icon: <GraduationCap className="h-5 w-5" />,
    permission: 'student:view',
  },
  {
    label: 'Roles',
    href: '/roles',
    icon: <Shield className="h-5 w-5" />,
    permission: 'role:view',
  },
  {
    label: 'Tasks',
    href: '/tasks',
    icon: <ClipboardList className="h-5 w-5" />,
    permission: 'task:view',
  },
  {
    label: 'Attendance',
    href: '/attendance',
    icon: <UserCheck className="h-5 w-5" />,
    permission: 'attendance:view',
  },
  {
    label: 'Exams',
    href: '/exams',
    icon: <GraduationCap className="h-5 w-5" />,
    permission: 'exam:view',
  },
  {
    label: 'Fee Management',
    href: '/fees',
    icon: <DollarSign className="h-5 w-5" />,
    permission: 'fee:view',
  },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { hasPermission, user, permissions } = useAuth();
  const { project } = useProject();
  const { isMenuAllocated } = useMenu();

  // Debug logging - remove after debugging
  console.log('[Sidebar Debug]', {
    project: project?.name,
    role: project?.role_name,
    permissions: permissions,
    hasAttendanceView: hasPermission('attendance:view'),
  });

  // Filter function to check both permission and menu allocation
  const isItemVisible = (item: NavItem): boolean => {
    // Check permission first
    if (item.permission && !hasPermission(item.permission)) {
      return false;
    }
    // Check if the menu is allocated to the project
    if (!isMenuAllocated(item.label)) {
      return false;
    }
    return true;
  };

  // Determine which nav items to show based on current role
  const getVisibleNavItems = (): NavItem[] => {
    // If no project selected, default to Super Admin view if user is super admin
    if (!project) {
      if (user?.is_super_admin) {
        return superAdminNavItems;
      }
      // No project and not super admin - show minimal nav
      return [superAdminNavItems[0]]; // Just dashboard
    }

    // Get the normalized role name from the current project selection
    const currentRoleName = project.role_name;
    const normalizedRole = normalizeRoleName(currentRoleName);

    // Return navigation items based on the role
    switch (normalizedRole) {
      case 'Super Admin':
        return superAdminNavItems;
      case 'School Admin':
        return schoolAdminNavItems.filter(isItemVisible);
      case 'Staff':
        return staffNavItems.filter(isItemVisible);
      default:
        // For any other custom roles, show staff-level navigation
        return staffNavItems.filter(isItemVisible);
    }
  };

  // Get current role display name
  const getCurrentRoleDisplay = (): string => {
    if (!project) {
      return user?.is_super_admin ? 'Super Admin' : '';
    }
    return project.role_name;
  };

  const visibleNavItems = getVisibleNavItems();
  const currentRole = getCurrentRoleDisplay();

  return (
    <aside
      className={cn(
        'fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Collapse Toggle */}
        <div className="flex items-center justify-center border-b py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {visibleNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    collapsed && 'justify-center px-2'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
      </div>
    </aside>
  );
}
