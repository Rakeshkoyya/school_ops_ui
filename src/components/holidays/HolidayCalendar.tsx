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
import { toast } from "sonner";
import type { ProjectHoliday } from "@/types";
import {
  createHoliday,
  deleteHoliday,
  getHolidays,
  holidayKeys,
} from "@/lib/holidays-api";
import { getCurrentProjectId } from "@/lib/api-client";

interface HolidayCalendarProps {
  projectId: number;
}

export function HolidayCalendar({ projectId }: HolidayCalendarProps) {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [holidayName, setHolidayName] = useState("");
  const [holidayDescription, setHolidayDescription] = useState("");

  // Get current month/year from selected date or today
  const displayDate = selectedDate || new Date();
  const year = displayDate.getFullYear();
  const month = displayDate.getMonth() + 1;

  // Fetch holidays for current month
  const { data: holidays = [], isLoading } = useQuery({
    queryKey: holidayKeys.list(projectId, year, month),
    queryFn: () => getHolidays({ year, month }),
  });

  // Create holiday mutation
  const createMutation = useMutation({
    mutationFn: createHoliday,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.lists() });
      setIsDialogOpen(false);
      setHolidayName("");
      setHolidayDescription("");
      setSelectedDate(undefined);
      
      const message =
        data.tasks_cancelled && data.tasks_cancelled > 0
          ? `Holiday added and ${data.tasks_cancelled} task(s) cancelled`
          : "Holiday added successfully";
      toast.success(message);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to create holiday");
    },
  });

  // Delete holiday mutation
  const deleteMutation = useMutation({
    mutationFn: deleteHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.lists() });
      toast.success("Holiday deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete holiday");
    },
  });

  // Convert holidays to a map for quick lookup
  const holidayDateMap = new Map(
    holidays.map((h) => [h.holiday_date, h])
  );

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setIsDialogOpen(true);
  };

  // Handle holiday creation
  const handleCreateHoliday = () => {
    if (!selectedDate) return;

    createMutation.mutate({
      holiday_date: format(selectedDate, "yyyy-MM-dd"),
      name: holidayName || undefined,
      description: holidayDescription || undefined,
    });
  };

  // Handle holiday deletion
  const handleDeleteHoliday = (holidayId: number) => {
    if (confirm("Are you sure you want to delete this holiday?")) {
      deleteMutation.mutate(holidayId);
    }
  };

  // Custom day renderer to show holidays
  const isDayHoliday = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return holidayDateMap.has(dateStr);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="rounded-md border"
            modifiers={{
              holiday: (date) => isDayHoliday(date),
            }}
            modifiersClassNames={{
              holiday: "bg-red-100 text-red-900 font-bold",
            }}
          />
          <p className="text-sm text-muted-foreground mt-2">
            Click on a date to mark it as a holiday
          </p>
        </div>

        <div className="ml-6 w-80">
          <h3 className="font-semibold mb-3">Holidays this month</h3>
          <ScrollArea className="h-[400px] rounded-md border p-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : holidays.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No holidays marked this month
              </p>
            ) : (
              <div className="space-y-3">
                {holidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className="flex items-start justify-between p-3 rounded-md border bg-card"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {format(new Date(holiday.holiday_date), "MMM dd")}
                        </Badge>
                        {holiday.name && (
                          <span className="font-medium text-sm">
                            {holiday.name}
                          </span>
                        )}
                      </div>
                      {holiday.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {holiday.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteHoliday(holiday.id)}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Holiday</DialogTitle>
            <DialogDescription>
              Mark {selectedDate && format(selectedDate, "MMMM dd, yyyy")} as a
              holiday. All scheduled tasks for this day will be skipped.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Holiday Name (Optional)</Label>
              <Input
                id="name"
                placeholder="e.g., Independence Day"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Additional notes..."
                value={holidayDescription}
                onChange={(e) => setHolidayDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setHolidayName("");
                setHolidayDescription("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateHoliday}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Adding..." : "Add Holiday"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
