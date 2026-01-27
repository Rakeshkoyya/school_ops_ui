'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout';
import { api } from '@/lib/api-client';
import { useProject } from '@/contexts/project-context';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  FileText,
  User,
  Calendar,
  Filter,
  Activity,
  Eye,
  Edit,
  Trash2,
  Plus,
  LogIn,
  LogOut,
  Upload,
} from 'lucide-react';
import type { AuditLog, PaginatedResponse } from '@/types';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

const actionConfig: Record<string, { icon: React.ElementType; color: string }> = {
  create: { icon: Plus, color: 'text-green-600 bg-green-100' },
  update: { icon: Edit, color: 'text-blue-600 bg-blue-100' },
  delete: { icon: Trash2, color: 'text-red-600 bg-red-100' },
  view: { icon: Eye, color: 'text-gray-600 bg-gray-100' },
  login: { icon: LogIn, color: 'text-purple-600 bg-purple-100' },
  logout: { icon: LogOut, color: 'text-orange-600 bg-orange-100' },
  upload: { icon: Upload, color: 'text-cyan-600 bg-cyan-100' },
};

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const { project } = useProject();

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', project?.id, actionFilter, entityFilter],
    queryFn: () =>
      api.get<PaginatedResponse<AuditLog>>('/audit-logs', {
        action: actionFilter !== 'all' ? actionFilter : undefined,
        entity_type: entityFilter !== 'all' ? entityFilter : undefined,
      }),
    enabled: !!project?.id,
  });

  // Mock data for development
  const mockLogs: AuditLog[] = [
    {
      id: 1,
      action: 'create',
      entity_type: 'task',
      entity_id: 'task-123',
      new_values: { title: 'Review attendance data', priority: 'high' },
      user: { id: 1, username: 'john_admin', name: 'John Admin', is_active: true, is_super_admin: false, evo_points: 0, created_at: '', updated_at: '' },
      ip_address: '192.168.1.100',
      project_id: 1,
      created_at: '2026-01-18T10:30:00Z',
    },
    {
      id: 2,
      action: 'upload',
      entity_type: 'attendance',
      entity_id: 'upload-456',
      new_values: { file_name: 'attendance_jan.xlsx', rows: 250 },
      user: { id: 2, username: 'sarah_teacher', name: 'Sarah Teacher', is_active: true, is_super_admin: false, evo_points: 0, created_at: '', updated_at: '' },
      ip_address: '192.168.1.101',
      project_id: 1,
      created_at: '2026-01-18T09:15:00Z',
    },
    {
      id: 3,
      action: 'update',
      entity_type: 'user',
      entity_id: 'user-789',
      old_values: { roles: ['Teacher'] },
      new_values: { roles: ['Teacher', 'Exam Coordinator'] },
      user: { id: 1, username: 'john_admin', name: 'John Admin', is_active: true, is_super_admin: false, evo_points: 0, created_at: '', updated_at: '' },
      ip_address: '192.168.1.100',
      project_id: 1,
      created_at: '2026-01-17T16:45:00Z',
    },
    {
      id: 4,
      action: 'login',
      entity_type: 'session',
      entity_id: 'session-abc',
      new_values: { browser: 'Chrome', os: 'Windows' },
      user: { id: 3, username: 'mike_coord', name: 'Mike Coordinator', is_active: true, is_super_admin: false, evo_points: 0, created_at: '', updated_at: '' },
      ip_address: '192.168.1.102',
      project_id: 1,
      created_at: '2026-01-17T08:00:00Z',
    },
    {
      id: 5,
      action: 'delete',
      entity_type: 'task',
      entity_id: 'task-456',
      old_values: { title: 'Old task', status: 'completed' },
      user: { id: 1, username: 'john_admin', name: 'John Admin', is_active: true, is_super_admin: false, evo_points: 0, created_at: '', updated_at: '' },
      ip_address: '192.168.1.100',
      project_id: 1,
      created_at: '2026-01-16T14:30:00Z',
    },
    {
      id: 6,
      action: 'create',
      entity_type: 'role',
      entity_id: 'role-new',
      new_values: { name: 'Lab Assistant', permissions: ['task:view'] },
      user: { id: 1, username: 'john_admin', name: 'John Admin', is_active: true, is_super_admin: false, evo_points: 0, created_at: '', updated_at: '' },
      ip_address: '192.168.1.100',
      project_id: 1,
      created_at: '2026-01-15T11:20:00Z',
    },
  ];

  const logs = data?.items || mockLogs;

  const filteredLogs = logs.filter(
    (log) =>
      log.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getActionDisplay = (action: string) => {
    const config = actionConfig[action] || { icon: Activity, color: 'text-gray-600 bg-gray-100' };
    const Icon = config.icon;
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${config.color}`}>
        <Icon className="h-3 w-3" />
        <span className="text-xs font-medium capitalize">{action}</span>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            Track all actions and changes in the system
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Activity Log
            </CardTitle>
            <CardDescription>View detailed history of all system actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="upload">Upload</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="exam">Exam</SelectItem>
                  <SelectItem value="session">Session</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <div>
                              <div>{format(new Date(log.created_at), 'MMM d, yyyy')}</div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(log.created_at), 'h:mm:ss a')}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium text-sm">{log.user.name}</div>
                              <div className="text-xs text-muted-foreground">@{log.user.username}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getActionDisplay(log.action)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {log.entity_type}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1 font-mono">
                            {log.entity_id}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            {log.new_values && (
                              <code className="text-xs bg-muted p-1 rounded block truncate">
                                {JSON.stringify(log.new_values)}
                              </code>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs text-muted-foreground">{log.ip_address}</code>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
