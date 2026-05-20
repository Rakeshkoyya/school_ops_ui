"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout";
import { useProject } from "@/contexts/project-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HolidayCalendar } from "@/components/holidays/HolidayCalendar";
import { UserLeaveCalendar } from "@/components/holidays/UserLeaveCalendar";
import { api } from "@/lib/api-client";
import type { User } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function HolidaysPage() {
  const { currentProject } = useProject();
  const [activeTab, setActiveTab] = useState("holidays");

  // Fetch project users for the leave calendar
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["project-users", currentProject?.id],
    queryFn: async () => {
      const response = await api.get<User[]>(`/projects/${currentProject?.slug}/users`);
      return response.data;
    },
    enabled: !!currentProject && activeTab === "leaves",
  });

  if (!currentProject) {
    return (
      <MainLayout title="Holidays & Leaves">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Please select a project first</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Holidays & Leaves">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Holidays & Leaves</h1>
          <p className="text-muted-foreground mt-2">
            Manage project holidays and user leaves. Scheduled recurring tasks will be
            automatically skipped on marked dates.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="holidays">Project Holidays</TabsTrigger>
            <TabsTrigger value="leaves">User Leaves</TabsTrigger>
          </TabsList>

          <TabsContent value="holidays" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Holidays</CardTitle>
                <CardDescription>
                  Mark dates as holidays for the entire project. No recurring tasks will
                  be generated for any user on these dates.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HolidayCalendar projectId={currentProject.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaves" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>User Leaves</CardTitle>
                <CardDescription>
                  Mark individual user leaves. Only the selected user's recurring tasks
                  will be skipped on their leave dates. Role-assigned tasks are not
                  affected.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="space-y-4 w-full max-w-2xl">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-64 w-full" />
                    </div>
                  </div>
                ) : users.length === 0 ? (
                  <div className="flex items-center justify-center h-96">
                    <p className="text-muted-foreground">
                      No users found in this project
                    </p>
                  </div>
                ) : (
                  <UserLeaveCalendar projectId={currentProject.id} users={users} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold mb-2">Important Notes</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>
              Holidays and leaves only affect <strong>recurring tasks</strong>, not
              manually created tasks
            </li>
            <li>
              If you mark a past date or today, pending tasks for that date will be
              automatically cancelled
            </li>
            <li>
              Deleting a holiday or leave does <strong>not</strong> restore cancelled
              tasks
            </li>
            <li>
              User leaves do not affect tasks assigned to roles (only user-assigned
              tasks are skipped)
            </li>
          </ul>
        </div>
      </div>
    </MainLayout>
  );
}
