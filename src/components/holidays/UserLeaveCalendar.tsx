"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import type { UserLeave, User } from "@/types";
import {
  createUserLeave,
  deleteUserLeave,
  getUserLeaves,
  leaveKeys,
} from "@/lib/holidays-api";

interface UserLeaveCalendarProps {
  projectId: number;
  users: User[]; // Project members
}

export function UserLeaveCalendar({ projectId, users }: UserLeaveCalendarProps) {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    users[0]?.id || null
  );
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveNotes, setLeaveNotes] = useState("");

  // Get current month/year from selected date or today
  const displayDate = selectedDate || new Date();
  const year = displayDate.getFullYear();
  const month = displayDate.getMonth() + 1;

  // Fetch leaves for selected user and current month
  const { data: leaves = [], isLoading } = useQuery({
    queryKey: leaveKeys.list(projectId, selectedUserId || undefined, year, month),
    queryFn: () =>
      getUserLeaves({
        user_id: selectedUserId || undefined,
        year,
        month,
      }),
    enabled: selectedUserId !== null,
  });

  // Create leave mutation
  const createMutation = useMutation({
    mutationFn: createUserLeave,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.lists() });
      setIsDialogOpen(false);
      setLeaveReason("");
      setLeaveNotes("");
      setSelectedDate(undefined);

      const message =
        data.tasks_cancelled && data.tasks_cancelled > 0
          ? `Leave added and ${data.tasks_cancelled} task(s) cancelled`
          : "Leave added successfully";
      toast.success(message);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to create leave");
    },
  });

  // Delete leave mutation
  const deleteMutation = useMutation({
    mutationFn: deleteUserLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.lists() });
      toast.success("Leave deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete leave");
    },
  });

  // Convert leaves to a map for quick lookup
  const leaveDateMap = new Map(leaves.map((l) => [l.leave_date, l]));

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (!date || !selectedUserId) return;
    setSelectedDate(date);
    setIsDialogOpen(true);
  };

  // Handle leave creation
  const handleCreateLeave = () => {
    if (!selectedDate || !selectedUserId) return;

    createMutation.mutate({
      user_id: selectedUserId,
      leave_date: format(selectedDate, "yyyy-MM-dd"),
      reason: leaveReason || undefined,
      notes: leaveNotes || undefined,
    });
  };

  // Handle leave deletion
  const handleDeleteLeave = (leaveId: number) => {
    if (confirm("Are you sure you want to delete this leave?")) {
      deleteMutation.mutate(leaveId);
    }
  };

  // Check if day has leave
  const isDayLeave = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return leaveDateMap.has(dateStr);
  };

  // Get selected user
  const selectedUser = users.find((u) => u.id === selectedUserId);

  // Get user initials
  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-6">
        {/* User list sidebar */}
        <div className="w-64 border rounded-md p-4">
          <h3 className="font-semibold mb-3">Select User</h3>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-md transition-colors ${
                    selectedUserId === user.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {getUserInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs opacity-75">{user.username}</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Calendar and leave list */}
        <div className="flex-1 flex gap-6">
          <div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              className="rounded-md border"
              disabled={!selectedUserId}
              modifiers={{
                leave: (date) => isDayLeave(date),
              }}
              modifiersClassNames={{
                leave: "bg-orange-100 text-orange-900 font-bold",
              }}
            />
            <p className="text-sm text-muted-foreground mt-2">
              {selectedUserId
                ? "Click on a date to mark as leave"
                : "Select a user first"}
            </p>
          </div>

          <div className="w-80">
            <h3 className="font-semibold mb-3">
              {selectedUser?.name}'s Leaves
            </h3>
            <ScrollArea className="h-[400px] rounded-md border p-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : leaves.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No leaves marked this month
                </p>
              ) : (
                <div className="space-y-3">
                  {leaves.map((leave) => (
                    <div
                      key={leave.id}
                      className="flex items-start justify-between p-3 rounded-md border bg-card"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {format(new Date(leave.leave_date), "MMM dd")}
                          </Badge>
                          {leave.reason && (
                            <span className="font-medium text-sm">
                              {leave.reason}
                            </span>
                          )}
                        </div>
                        {leave.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {leave.notes}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteLeave(leave.id)}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Leave</DialogTitle>
            <DialogDescription>
              Mark {selectedDate && format(selectedDate, "MMMM dd, yyyy")} as
              leave for {selectedUser?.name}. Their scheduled tasks for this day
              will be skipped.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Input
                id="reason"
                placeholder="e.g., Sick leave, Personal"
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                value={leaveNotes}
                onChange={(e) => setLeaveNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setLeaveReason("");
                setLeaveNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateLeave}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Adding..." : "Add Leave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
