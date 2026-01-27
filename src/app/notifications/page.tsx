'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  Check,
  CheckCheck,
  Info,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import type { Notification, NotificationType, PaginatedResponse } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';

const typeConfig: Record<NotificationType, { icon: React.ElementType; className: string }> = {
  info: { icon: Info, className: 'bg-blue-100 text-blue-600' },
  success: { icon: CheckCircle2, className: 'bg-green-100 text-green-600' },
  warning: { icon: AlertCircle, className: 'bg-amber-100 text-amber-600' },
  error: { icon: XCircle, className: 'bg-red-100 text-red-600' },
};

function NotificationCard({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: number) => void;
}) {
  const config = typeConfig[notification.type];
  const Icon = config.icon;

  return (
    <Card className={`transition-colors ${!notification.is_read ? 'bg-primary/5 border-primary/20' : ''}`}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className={`p-2 rounded-full h-fit ${config.className}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-medium text-sm">{notification.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
              </div>
              {!notification.is_read && (
                <Badge variant="secondary" className="shrink-0">New</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </div>
              <div className="flex items-center gap-2">
                {notification.action_url && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={notification.action_url}>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Link>
                  </Button>
                )}
                {!notification.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMarkRead(notification.id)}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Mark Read
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<PaginatedResponse<Notification>>('/notifications'),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => api.post('/notifications/mark-read', { notification_ids: [id] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification marked as read');
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.post('/notifications/mark-all-read', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  // Mock data for development
  const mockNotifications: Notification[] = [
    {
      id: 1,
      title: 'Upload Completed',
      message: 'Your attendance file has been processed successfully. 250 records imported.',
      type: 'success',
      is_read: false,
      action_url: '/uploads/1',
      user_id: 1,
      created_at: '2026-01-18T10:30:00Z',
    },
    {
      id: 2,
      title: 'Upload Failed',
      message: 'Failed to process exam results file. Please check the format and try again.',
      type: 'error',
      is_read: false,
      action_url: '/uploads/2',
      user_id: 1,
      created_at: '2026-01-18T09:15:00Z',
    },
    {
      id: 3,
      title: 'New Task Assigned',
      message: 'You have been assigned a new task: "Review attendance data for Class 10A"',
      type: 'info',
      is_read: false,
      action_url: '/tasks',
      user_id: 1,
      created_at: '2026-01-17T16:45:00Z',
    },
    {
      id: 4,
      title: 'Task Due Soon',
      message: 'Task "Prepare exam schedule" is due tomorrow. Please complete it on time.',
      type: 'warning',
      is_read: true,
      action_url: '/tasks',
      user_id: 1,
      created_at: '2026-01-17T08:00:00Z',
    },
    {
      id: 5,
      title: 'Role Updated',
      message: 'Your roles have been updated. You now have access to exam management features.',
      type: 'info',
      is_read: true,
      user_id: 1,
      created_at: '2026-01-16T14:30:00Z',
    },
    {
      id: 6,
      title: 'Welcome to School Ops',
      message: 'Welcome! Get started by exploring the dashboard and completing your profile.',
      type: 'success',
      is_read: true,
      action_url: '/dashboard',
      user_id: 1,
      created_at: '2026-01-15T11:20:00Z',
    },
  ];

  const notifications = data?.items || mockNotifications;
  const unreadNotifications = notifications.filter((n) => !n.is_read);
  const readNotifications = notifications.filter((n) => n.is_read);

  const handleMarkRead = (id: number) => {
    markReadMutation.mutate(id);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground mt-1">
              Stay updated with important alerts and messages
            </p>
          </div>
          {unreadNotifications.length > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark All as Read
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{notifications.length}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100">
                  <Info className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{unreadNotifications.length}</p>
                  <p className="text-sm text-muted-foreground">Unread</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100">
                  <CheckCheck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{readNotifications.length}</p>
                  <p className="text-sm text-muted-foreground">Read</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications List */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              All
              <Badge variant="secondary" className="ml-2">
                {notifications.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {unreadNotifications.length > 0 && (
                <Badge className="ml-2">{unreadNotifications.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="read">Read</TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[120px]" />
              ))}
            </div>
          ) : (
            <>
              <TabsContent value="all" className="space-y-4">
                {notifications.length === 0 ? (
                  <Card className="py-12 text-center">
                    <CardContent>
                      <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Notifications</h3>
                      <p className="text-muted-foreground">
                        You&apos;re all caught up! New notifications will appear here.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  notifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onMarkRead={handleMarkRead}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="unread" className="space-y-4">
                {unreadNotifications.length === 0 ? (
                  <Card className="py-12 text-center">
                    <CardContent>
                      <CheckCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
                      <p className="text-muted-foreground">
                        You&apos;ve read all your notifications.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  unreadNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onMarkRead={handleMarkRead}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="read" className="space-y-4">
                {readNotifications.length === 0 ? (
                  <Card className="py-12 text-center">
                    <CardContent>
                      <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Read Notifications</h3>
                      <p className="text-muted-foreground">
                        Notifications you&apos;ve read will appear here.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  readNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onMarkRead={handleMarkRead}
                    />
                  ))
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}
