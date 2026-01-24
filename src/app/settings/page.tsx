'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout';
import { api } from '@/lib/api-client';
import { useProject } from '@/contexts/project-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Building2,
  Palette,
  Bell,
  Clock,
  GraduationCap,
  Save,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// Settings form schema
const settingsSchema = z.object({
  project_name: z.string().min(2, 'Project name must be at least 2 characters'),
  academic_year: z.string(),
  timezone: z.string(),
  theme_color: z.string(),
  attendance_cutoff: z.string(),
  email_notifications: z.boolean(),
  push_notifications: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { project, setProject } = useProject();
  const queryClient = useQueryClient();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      project_name: project?.name || '',
      academic_year: '2025-2026',
      timezone: 'Asia/Kolkata',
      theme_color: project?.theme_color || '#3b82f6',
      attendance_cutoff: '09:00',
      email_notifications: true,
      push_notifications: true,
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: SettingsFormValues) =>
      api.patch(`/projects/${project?.id}/settings`, data),
    onSuccess: () => {
      toast.success('Settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['project'] });
    },
    onError: () => {
      toast.error('Failed to update settings');
    },
  });

  const onSubmit = (data: SettingsFormValues) => {
    updateMutation.mutate(data);
  };

  const presetColors = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Teal', value: '#14b8a6' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your project settings and preferences
          </p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">
              <Building2 className="mr-2 h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="mr-2 h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="academic">
              <GraduationCap className="mr-2 h-4 w-4" />
              Academic
            </TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* General Settings */}
              <TabsContent value="general">
                <Card>
                  <CardHeader>
                    <CardTitle>General Settings</CardTitle>
                    <CardDescription>
                      Basic project information and configuration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="project_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Name</FormLabel>
                          <FormControl>
                            <Input placeholder="My School" {...field} />
                          </FormControl>
                          <FormDescription>
                            This is the display name for your school/project
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timezone</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select timezone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                              <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                              <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                              <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                              <SelectItem value="Asia/Singapore">Asia/Singapore (SGT)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            All timestamps will be displayed in this timezone
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end">
                      <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Appearance Settings */}
              <TabsContent value="appearance">
                <Card>
                  <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>
                      Customize the look and feel of your project
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="theme_color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Theme Color</FormLabel>
                          <FormControl>
                            <div className="space-y-4">
                              <div className="flex flex-wrap gap-3">
                                {presetColors.map((color) => (
                                  <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => field.onChange(color.value)}
                                    className={`h-10 w-10 rounded-full border-2 transition-all ${
                                      field.value === color.value
                                        ? 'border-primary ring-2 ring-primary ring-offset-2'
                                        : 'border-transparent'
                                    }`}
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                  />
                                ))}
                              </div>
                              <div className="flex items-center gap-3">
                                <Input
                                  type="color"
                                  value={field.value}
                                  onChange={(e) => field.onChange(e.target.value)}
                                  className="h-10 w-20 p-1 cursor-pointer"
                                />
                                <Input
                                  value={field.value}
                                  onChange={(e) => field.onChange(e.target.value)}
                                  placeholder="#3b82f6"
                                  className="w-32"
                                />
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription>
                            This color will be used as the primary accent color throughout the app
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end">
                      <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notification Settings */}
              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>
                      Configure how you receive notifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="email_notifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Email Notifications</FormLabel>
                            <FormDescription>
                              Receive email notifications for important events
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="push_notifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Push Notifications</FormLabel>
                            <FormDescription>
                              Receive browser push notifications for real-time updates
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end">
                      <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Academic Settings */}
              <TabsContent value="academic">
                <Card>
                  <CardHeader>
                    <CardTitle>Academic Settings</CardTitle>
                    <CardDescription>
                      Configure academic year and attendance settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="academic_year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Academic Year</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select academic year" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="2024-2025">2024-2025</SelectItem>
                              <SelectItem value="2025-2026">2025-2026</SelectItem>
                              <SelectItem value="2026-2027">2026-2027</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Current academic year for record keeping
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="attendance_cutoff"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Attendance Cutoff Time</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <Input type="time" {...field} className="w-32" />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Students arriving after this time will be marked as late
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <div>
                      <h4 className="text-sm font-medium mb-3">Grading Scale</h4>
                      <div className="grid gap-2 text-sm">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                          <span>A+ (90-100%)</span>
                          <span className="text-green-600 font-medium">Excellent</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                          <span>A (80-89%)</span>
                          <span className="text-green-600 font-medium">Very Good</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                          <span>B+ (70-79%)</span>
                          <span className="text-blue-600 font-medium">Good</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                          <span>B (60-69%)</span>
                          <span className="text-blue-600 font-medium">Above Average</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                          <span>C (50-59%)</span>
                          <span className="text-amber-600 font-medium">Average</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                          <span>D (40-49%)</span>
                          <span className="text-orange-600 font-medium">Below Average</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                          <span>F (&lt;40%)</span>
                          <span className="text-red-600 font-medium">Fail</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </form>
          </Form>
        </Tabs>
      </div>
    </MainLayout>
  );
}
