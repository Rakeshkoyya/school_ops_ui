'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout';
import { api } from '@/lib/api-client';
import { useProject } from '@/contexts/project-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  MoreHorizontal,
  Play,
  CheckCircle2,
  Calendar,
  Trash2,
  Edit3,
  Filter,
  Settings2,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  User,
  Layers,
  Repeat,
  Folder,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import type {
  Task,
  TaskStatus,
  TaskCategory,
  CreateTaskPayload,
  StaffMember,
  RecurrenceType,
  CreateRecurringTaskTemplatePayload,
  TaskCompletionResponse,
  EvoReductionType,
  EvoPointBalance,
  RecurringTaskTemplate,
  UpdateRecurringTaskTemplatePayload,
} from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

// DataTable imports
import {
  DataTable,
  getColumns,
  statusConfig,
  statusFilterOptions,
  getCategoryFilterOptions,
  getAssigneeFilterOptions,
} from '@/components/tasks/data-table';

// ==================== Types ====================

type GroupByOption = 'none' | 'category' | 'status' | 'assignee' | 'recurrence';
type ViewMode = 'my' | 'all' | 'scheduled';

interface TasksResponse {
  items: Task[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ==================== Category Manager Dialog ====================

const CATEGORY_COLORS = [
  { name: 'Gray', value: '#6B7280' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Lime', value: '#84CC16' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Sky', value: '#0EA5E9' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Violet', value: '#8B5CF6' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Fuchsia', value: '#D946EF' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Rose', value: '#F43F5E' },
];

function CategoryManagerDialog({
  open,
  onOpenChange,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: TaskCategory[];
}) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editColor, setEditColor] = useState('');
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: { name: string; color: string }) => api.post<TaskCategory>('/tasks/categories', data),
    // Optimistic update - add to list immediately
    onMutate: async (newCategory) => {
      await queryClient.cancelQueries({ queryKey: ['task-categories'] });
      
      // Since we don't have the id yet, create a temp placeholder
      const optimisticCategory: TaskCategory = {
        id: Date.now(), // Temp ID
        project_id: 0,
        name: newCategory.name,
        color: newCategory.color,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Get all matching queries and update them
      queryClient.setQueriesData<TaskCategory[]>(
        { queryKey: ['task-categories'] },
        (old) => old ? [...old, optimisticCategory] : [optimisticCategory]
      );
      
      return { optimisticId: optimisticCategory.id };
    },
    onSuccess: () => {
      toast.success('Category created');
      queryClient.invalidateQueries({ queryKey: ['task-categories'] });
      setNewCategoryName('');
      setNewCategoryColor('#3B82F6');
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['task-categories'] });
      toast.error('Failed to create category');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, color }: { id: number; name: string; color: string }) =>
      api.patch(`/tasks/categories/${id}`, { name, color }),
    // Optimistic update
    onMutate: async ({ id, name, color }) => {
      await queryClient.cancelQueries({ queryKey: ['task-categories'] });
      
      queryClient.setQueriesData<TaskCategory[]>(
        { queryKey: ['task-categories'] },
        (old) => old?.map(cat => cat.id === id ? { ...cat, name, color } : cat)
      );
      
      return { id };
    },
    onSuccess: () => {
      toast.success('Category updated');
      queryClient.invalidateQueries({ queryKey: ['task-categories'] });
      setEditingId(null);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['task-categories'] });
      toast.error('Failed to update category');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/tasks/categories/${id}`),
    // Optimistic update - remove immediately
    onMutate: async (categoryId) => {
      await queryClient.cancelQueries({ queryKey: ['task-categories'] });
      
      queryClient.setQueriesData<TaskCategory[]>(
        { queryKey: ['task-categories'] },
        (old) => old?.filter(cat => cat.id !== categoryId)
      );
      
      return { categoryId };
    },
    onSuccess: () => {
      toast.success('Category deleted');
      queryClient.invalidateQueries({ queryKey: ['task-categories'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['task-categories'] });
      toast.error('Failed to delete category');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Manage Categories
          </DialogTitle>
          <DialogDescription>Create, edit, or delete task categories</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add new category */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="New category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCategoryName.trim()) {
                    createMutation.mutate({ name: newCategoryName.trim(), color: newCategoryColor });
                  }
                }}
              />
              <Button
                size="sm"
                onClick={() => newCategoryName.trim() && createMutation.mutate({ name: newCategoryName.trim(), color: newCategoryColor })}
                disabled={!newCategoryName.trim() || createMutation.isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {/* Color picker for new category */}
            <div className="flex flex-wrap gap-1">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={cn(
                    'w-6 h-6 rounded-full border-2 transition-all',
                    newCategoryColor === color.value ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setNewCategoryColor(color.value)}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Category list */}
          <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
            {categories.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No categories yet. Create one above.
              </div>
            ) : (
              categories.map((category) => (
                <div key={category.id} className="p-3 hover:bg-gray-50">
                  {editingId === category.id ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (editValue.trim()) {
                              updateMutation.mutate({ id: category.id, name: editValue.trim(), color: editColor });
                            }
                          }}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4 text-gray-500" />
                        </Button>
                      </div>
                      {/* Color picker for editing */}
                      <div className="flex flex-wrap gap-1">
                        {CATEGORY_COLORS.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            className={cn(
                              'w-5 h-5 rounded-full border-2 transition-all',
                              editColor === color.value ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'
                            )}
                            style={{ backgroundColor: color.value }}
                            onClick={() => setEditColor(color.value)}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: category.color || '#6B7280' }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(category.id);
                            setEditValue(category.name);
                            setEditColor(category.color || '#6B7280');
                          }}
                        >
                          <Edit3 className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(category.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Add Task Dialog ====================

const DAYS_OF_WEEK = [
  { value: '0', label: 'Mon' },
  { value: '1', label: 'Tue' },
  { value: '2', label: 'Wed' },
  { value: '3', label: 'Thu' },
  { value: '4', label: 'Fri' },
  { value: '5', label: 'Sat' },
  { value: '6', label: 'Sun' },
];

type TaskMode = 'one-time' | 'recurring';

function AddTaskDialog({
  open,
  onOpenChange,
  categories,
  staffList,
  preselectedAssignee,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: TaskCategory[];
  staffList?: StaffMember[];
  preselectedAssignee?: StaffMember | null;
}) {
  // Basic task fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [assignedToUserId, setAssignedToUserId] = useState<number | undefined>(undefined);
  
  // Evo Points fields
  const [evoPoints, setEvoPoints] = useState<number | undefined>(undefined);
  const [evoReductionType, setEvoReductionType] = useState<EvoReductionType>('NONE');
  const [evoExtensionEnd, setEvoExtensionEnd] = useState('');
  const [evoFixedReductionPoints, setEvoFixedReductionPoints] = useState<number | undefined>(undefined);
  
  // Task mode
  const [taskMode, setTaskMode] = useState<TaskMode>('one-time');
  
  // One-time task fields
  const [dueDateTime, setDueDateTime] = useState('');
  
  // Recurring task fields
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('daily');
  const [selectedDays, setSelectedDays] = useState<string[]>(['0', '1', '2', '3', '4']); // Mon-Fri default
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [dueTime, setDueTime] = useState('17:00');
  const [createTaskToday, setCreateTaskToday] = useState(true);
  
  const queryClient = useQueryClient();

  // Update assigned user when preselectedAssignee changes
  useEffect(() => {
    if (preselectedAssignee) {
      setAssignedToUserId(preselectedAssignee.id);
    }
  }, [preselectedAssignee, open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setTitle('');
      setDescription('');
      setCategoryId(undefined);
      setAssignedToUserId(undefined);
      setEvoPoints(undefined);
      setEvoReductionType('NONE');
      setEvoExtensionEnd('');
      setEvoFixedReductionPoints(undefined);
      setTaskMode('one-time');
      setDueDateTime('');
      setRecurrenceType('daily');
      setSelectedDays(['0', '1', '2', '3', '4']);
      setScheduledDate('');
      setStartTime('09:00');
      setDueTime('17:00');
      setCreateTaskToday(true);
    }
  }, [open]);

  // Check if today is one of the selected days (for weekly recurrence)
  const todayWeekday = new Date().getDay();
  // Convert JS weekday (0=Sun) to our format (0=Mon)
  const todayOurFormat = todayWeekday === 0 ? '6' : String(todayWeekday - 1);
  const isTodaySelected = selectedDays.includes(todayOurFormat);

  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskPayload) => api.post('/tasks', data),
    onSuccess: () => {
      toast.success(preselectedAssignee ? 'Task assigned' : 'Task created');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      onOpenChange(false);
    },
    onError: () => toast.error(preselectedAssignee ? 'Failed to assign task' : 'Failed to create task'),
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: CreateRecurringTaskTemplatePayload) => api.post('/tasks/recurring-templates', data),
    onSuccess: () => {
      toast.success(createTaskToday && recurrenceType !== 'once' 
        ? 'Recurring schedule created with task for today' 
        : 'Recurring schedule created');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['recurring-templates'] });
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to create recurring schedule'),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (taskMode === 'one-time') {
      // Create a one-time task
      const taskData: CreateTaskPayload = {
        title,
        description: description || undefined,
        category_id: categoryId,
        due_datetime: dueDateTime || undefined,
        assigned_to_user_id: assignedToUserId,
        // Evo Points fields
        evo_points: evoPoints,
        evo_reduction_type: evoPoints ? evoReductionType : undefined,
        evo_extension_end: evoReductionType === 'GRADUAL' && evoExtensionEnd ? evoExtensionEnd : undefined,
        evo_fixed_reduction_points: evoReductionType === 'FIXED' ? evoFixedReductionPoints : undefined,
      };
      await createTaskMutation.mutateAsync(taskData);
    } else {
      // Create a recurring template
      const templateData: CreateRecurringTaskTemplatePayload = {
        title,
        description: description || undefined,
        category_id: categoryId,
        recurrence_type: recurrenceType,
        days_of_week: recurrenceType === 'weekly' ? selectedDays.sort().join(',') : undefined,
        scheduled_date: recurrenceType === 'once' ? scheduledDate : undefined,
        start_time: startTime ? `${startTime}:00` : undefined,
        due_time: dueTime ? `${dueTime}:00` : undefined,
        assigned_to_user_id: assignedToUserId,
        create_task_today: recurrenceType !== 'once' && createTaskToday,
        // Evo Points fields
        evo_points: evoPoints,
        evo_reduction_type: evoPoints ? evoReductionType : undefined,
        evo_extension_time: evoReductionType !== 'NONE' && evoExtensionEnd 
          ? `${evoExtensionEnd.split('T')[1] || evoExtensionEnd}:00`
          : undefined,
        evo_fixed_reduction_points: evoReductionType === 'FIXED' ? evoFixedReductionPoints : undefined,
      };
      await createTemplateMutation.mutateAsync(templateData);
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const isPending = createTaskMutation.isPending || createTemplateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {preselectedAssignee 
                ? `Assign Task to ${preselectedAssignee.name}` 
                : 'Create New Task'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Task Type Selection */}
            <Tabs value={taskMode} onValueChange={(v) => setTaskMode(v as TaskMode)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="one-time" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  One-time
                </TabsTrigger>
                <TabsTrigger value="recurring" className="flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  Recurring
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Common Fields */}
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={categoryId?.toString() || '__none__'}
                  onValueChange={(v) => setCategoryId(v === '__none__' ? undefined : parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No category</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* One-time: Due Date & Time */}
              {taskMode === 'one-time' && (
                <div className="grid gap-2">
                  <Label>Due Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={dueDateTime}
                    onChange={(e) => setDueDateTime(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Assignee selector */}
            {!preselectedAssignee && staffList && staffList.length > 0 && (
              <div className="grid gap-2">
                <Label>Assign To</Label>
                <Select
                  value={assignedToUserId?.toString() || '__none__'}
                  onValueChange={(v) => setAssignedToUserId(v === '__none__' ? undefined : parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Myself" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Myself</SelectItem>
                    {staffList.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id.toString()}>
                        {staff.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Show assigned user info when preselected */}
            {preselectedAssignee && (
              <div className="grid gap-2">
                <Label>Assigning To</Label>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border">
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                    {preselectedAssignee.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{preselectedAssignee.name}</span>
                    <span className="text-xs text-muted-foreground">{preselectedAssignee.email}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Evo Points Section - Collapsible */}
            <details className="group border rounded-lg">
              <summary className="flex items-center justify-between px-3 py-2 cursor-pointer select-none hover:bg-muted/50">
                <span className="text-sm font-medium">Evo Points</span>
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-3 pb-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Points</Label>
                    <Input
                      type="number"
                      min="0"
                      value={evoPoints ?? ''}
                      onChange={(e) => setEvoPoints(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="0"
                      className="h-8"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Late Penalty</Label>
                    <Select
                      value={evoReductionType}
                      onValueChange={(v) => setEvoReductionType(v as EvoReductionType)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        <SelectItem value="GRADUAL">Gradual</SelectItem>
                        <SelectItem value="FIXED">Fixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {evoReductionType === 'GRADUAL' && (
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Decay End Time</Label>
                    <Input
                      type="datetime-local"
                      value={evoExtensionEnd}
                      onChange={(e) => setEvoExtensionEnd(e.target.value)}
                      className="h-8"
                    />
                    <p className="text-xs text-muted-foreground">
                      Points will gradually decrease from full value to 0 between due time and this end time.
                    </p>
                  </div>
                )}

                {evoReductionType === 'FIXED' && (
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Deduction Amount</Label>
                    <Input
                      type="number"
                      min="0"
                      value={evoFixedReductionPoints ?? ''}
                      onChange={(e) => setEvoFixedReductionPoints(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="0"
                      className="h-8"
                    />
                    <p className="text-xs text-muted-foreground">
                      This amount will be subtracted from the points if completed after due time.
                    </p>
                  </div>
                )}
              </div>
            </details>

            {/* Recurring Task Options */}
            {taskMode === 'recurring' && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                <div className="grid gap-2">
                  <Label>Schedule Type</Label>
                  <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as RecurrenceType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily (every day)</SelectItem>
                      <SelectItem value="weekly">Weekly (specific days)</SelectItem>
                      <SelectItem value="once">Scheduled (specific date)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recurrenceType === 'weekly' && (
                  <div className="grid gap-2">
                    <Label>Days of Week</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <Button
                          key={day.value}
                          type="button"
                          variant={selectedDays.includes(day.value) ? 'default' : 'outline'}
                          size="sm"
                          className="w-12"
                          onClick={() => toggleDay(day.value)}
                        >
                          {day.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {recurrenceType === 'once' && (
                  <div className="grid gap-2">
                    <Label>Scheduled Date</Label>
                    <Input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      required={recurrenceType === 'once'}
                    />
                  </div>
                )}

                {/* Time settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Start Time (IST)</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Due Time (IST)</Label>
                    <Input
                      type="time"
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* Create task for today option */}
                {recurrenceType !== 'once' && (
                  <div className="flex items-center space-x-2 pt-2 border-t">
                    <Checkbox
                      id="create-today"
                      checked={createTaskToday}
                      onCheckedChange={(checked) => setCreateTaskToday(checked as boolean)}
                      disabled={recurrenceType === 'weekly' && !isTodaySelected}
                    />
                    <label
                      htmlFor="create-today"
                      className={cn(
                        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed",
                        recurrenceType === 'weekly' && !isTodaySelected && "text-muted-foreground"
                      )}
                    >
                      Also create task for today
                    </label>
                  </div>
                )}

                {/* Info text */}
                <p className="text-xs text-muted-foreground pt-2">
                  {recurrenceType === 'daily' && 'A new task will be created every day at midnight (IST).'}
                  {recurrenceType === 'weekly' && selectedDays.length > 0 && 
                    `Tasks will be created on ${selectedDays.sort().map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(', ')} at midnight (IST).`}
                  {recurrenceType === 'once' && scheduledDate && 
                    `Task will be created on ${format(new Date(scheduledDate + 'T00:00:00'), 'PPP')} at midnight (IST).`}
                  {recurrenceType === 'weekly' && !isTodaySelected && createTaskToday &&
                    ' Today is not a selected day, so no task will be created today.'}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isPending || !title.trim() || (taskMode === 'recurring' && recurrenceType === 'once' && !scheduledDate)}
            >
              {isPending 
                ? 'Creating...' 
                : taskMode === 'one-time'
                  ? (preselectedAssignee ? 'Assign Task' : 'Create Task')
                  : (createTaskToday && recurrenceType !== 'once' ? 'Create & Schedule' : 'Schedule')
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Edit Recurring Template Dialog ====================

function EditRecurringTemplateDialog({
  open,
  onOpenChange,
  template,
  categories,
  staffList,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: RecurringTaskTemplate | null;
  categories: TaskCategory[];
  staffList?: StaffMember[];
  onSave: (data: UpdateRecurringTaskTemplatePayload) => void;
  isSaving: boolean;
}) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [assignedToUserId, setAssignedToUserId] = useState<number | undefined>(undefined);
  
  // Recurrence settings
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('daily');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [dueTime, setDueTime] = useState('');
  
  // Evo Points
  const [evoPoints, setEvoPoints] = useState<number | undefined>(undefined);
  const [evoReductionType, setEvoReductionType] = useState<EvoReductionType>('NONE');
  const [evoExtensionTime, setEvoExtensionTime] = useState('');
  const [evoFixedReductionPoints, setEvoFixedReductionPoints] = useState<number | undefined>(undefined);
  
  // Active status
  const [isActive, setIsActive] = useState(true);

  // Populate form when template changes
  useEffect(() => {
    if (template && open) {
      setTitle(template.title);
      setDescription(template.description || '');
      setCategoryId(template.category_id || undefined);
      setAssignedToUserId(template.assigned_to_user_id || undefined);
      setRecurrenceType(template.recurrence_type);
      setSelectedDays(template.days_of_week?.split(',') || []);
      setScheduledDate(template.scheduled_date || '');
      setStartTime(template.start_time?.substring(0, 5) || '');
      setDueTime(template.due_time?.substring(0, 5) || '');
      setEvoPoints(template.evo_points || undefined);
      setEvoReductionType(template.evo_reduction_type || 'NONE');
      setEvoExtensionTime(template.evo_extension_time?.substring(0, 5) || '');
      setEvoFixedReductionPoints(template.evo_fixed_reduction_points || undefined);
      setIsActive(template.is_active);
    }
  }, [template, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateData: UpdateRecurringTaskTemplatePayload = {
      title,
      description: description || undefined,
      category_id: categoryId,
      recurrence_type: recurrenceType,
      days_of_week: recurrenceType === 'weekly' ? selectedDays.sort().join(',') : undefined,
      scheduled_date: recurrenceType === 'once' ? scheduledDate : undefined,
      start_time: startTime ? `${startTime}:00` : undefined,
      due_time: dueTime ? `${dueTime}:00` : undefined,
      assigned_to_user_id: assignedToUserId,
      evo_points: evoPoints,
      evo_reduction_type: evoPoints ? evoReductionType : undefined,
      evo_extension_time: evoReductionType !== 'NONE' && evoExtensionTime 
        ? `${evoExtensionTime}:00`
        : undefined,
      evo_fixed_reduction_points: evoReductionType === 'FIXED' ? evoFixedReductionPoints : undefined,
      is_active: isActive,
    };
    
    onSave(updateData);
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Scheduled Task</DialogTitle>
            <DialogDescription>
              Update the recurring task schedule and settings.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                required
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details..."
                rows={2}
              />
            </div>

            {/* Category & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={categoryId?.toString() || '__none__'}
                  onValueChange={(v) => setCategoryId(v === '__none__' ? undefined : parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No category</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={isActive ? 'active' : 'inactive'}
                  onValueChange={(v) => setIsActive(v === 'active')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assignee */}
            {staffList && staffList.length > 0 && (
              <div className="grid gap-2">
                <Label>Assign To</Label>
                <Select
                  value={assignedToUserId?.toString() || '__none__'}
                  onValueChange={(v) => setAssignedToUserId(v === '__none__' ? undefined : parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not assigned</SelectItem>
                    {staffList.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id.toString()}>
                        {staff.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Recurrence Settings */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
              <div className="grid gap-2">
                <Label>Schedule Type</Label>
                <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as RecurrenceType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily (every day)</SelectItem>
                    <SelectItem value="weekly">Weekly (specific days)</SelectItem>
                    <SelectItem value="once">Scheduled (specific date)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {recurrenceType === 'weekly' && (
                <div className="grid gap-2">
                  <Label>Days of Week</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <Button
                        key={day.value}
                        type="button"
                        variant={selectedDays.includes(day.value) ? 'default' : 'outline'}
                        size="sm"
                        className="w-12"
                        onClick={() => toggleDay(day.value)}
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {recurrenceType === 'once' && (
                <div className="grid gap-2">
                  <Label>Scheduled Date</Label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    required={recurrenceType === 'once'}
                  />
                </div>
              )}

              {/* Time settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Start Time (IST)</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Due Time (IST)</Label>
                  <Input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Evo Points Section */}
            <details className="group border rounded-lg">
              <summary className="flex items-center justify-between px-3 py-2 cursor-pointer select-none hover:bg-muted/50">
                <span className="text-sm font-medium">Evo Points</span>
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-3 pb-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Points</Label>
                    <Input
                      type="number"
                      min="0"
                      value={evoPoints ?? ''}
                      onChange={(e) => setEvoPoints(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="0"
                      className="h-8"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Late Penalty</Label>
                    <Select
                      value={evoReductionType}
                      onValueChange={(v) => setEvoReductionType(v as EvoReductionType)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        <SelectItem value="GRADUAL">Gradual</SelectItem>
                        <SelectItem value="FIXED">Fixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {evoReductionType === 'GRADUAL' && (
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Decay End Time</Label>
                    <Input
                      type="time"
                      value={evoExtensionTime}
                      onChange={(e) => setEvoExtensionTime(e.target.value)}
                      className="h-8"
                    />
                    <p className="text-xs text-muted-foreground">
                      Points will gradually decrease from full value to 0 between due time and this end time.
                    </p>
                  </div>
                )}

                {evoReductionType === 'FIXED' && (
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Deduction Amount</Label>
                    <Input
                      type="number"
                      min="0"
                      value={evoFixedReductionPoints ?? ''}
                      onChange={(e) => setEvoFixedReductionPoints(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="0"
                      className="h-8"
                    />
                    <p className="text-xs text-muted-foreground">
                      This amount will be subtracted from the points if completed after due time.
                    </p>
                  </div>
                )}
              </div>
            </details>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving || !title.trim() || (recurrenceType === 'once' && !scheduledDate)}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Main Page Component ====================

export default function TasksPage() {
  const { project, isProjectAdmin } = useProject();
  const queryClient = useQueryClient();
  
  // UI State
  const [showAddTask, setShowAddTask] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showNewTaskRow, setShowNewTaskRow] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('my');
  // Grouping for all views
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Data Queries
  const { data: myTasks, isLoading: loadingMyTasks } = useQuery({
    queryKey: ['my-tasks', project?.id],
    queryFn: () => api.get<Task[]>('/tasks/my-tasks'),
    enabled: !!project?.id,
    refetchInterval: 30000,
  });

  const { data: allTasksData, isLoading: loadingAllTasks } = useQuery({
    queryKey: ['tasks', project?.id],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('page_size', '100');
      return api.get<TasksResponse>(`/tasks?${params}`);
    },
    enabled: !!project?.id && viewMode === 'all',
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['task-categories', project?.id],
    queryFn: () => api.get<TaskCategory[]>('/tasks/categories'),
    enabled: !!project?.id,
  });

  // Scheduled Tasks Filter State
  const [scheduledStatusFilter, setScheduledStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [scheduledAssigneeFilter, setScheduledAssigneeFilter] = useState<number | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<RecurringTaskTemplate | null>(null);

  // Recurring Templates Query
  const { data: recurringTemplates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['recurring-templates', project?.id, isProjectAdmin, scheduledStatusFilter, scheduledAssigneeFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('include_inactive', 'true');
      // Staff only sees their own templates
      if (!isProjectAdmin) {
        params.append('my_templates_only', 'true');
      }
      // Status filter
      if (scheduledStatusFilter !== 'all') {
        params.append('is_active', scheduledStatusFilter === 'active' ? 'true' : 'false');
      }
      // Assignee filter (admin only)
      if (isProjectAdmin && scheduledAssigneeFilter) {
        params.append('assigned_to_user_id', scheduledAssigneeFilter.toString());
      }
      return api.get<RecurringTaskTemplate[]>(`/tasks/recurring-templates?${params}`);
    },
    enabled: !!project?.id && viewMode === 'scheduled',
  });

  const { data: staffList } = useQuery({
    queryKey: ['admin-staff'],
    queryFn: () => api.get<StaffMember[]>('/tasks/admin/staff'),
    enabled: !!project?.id && isProjectAdmin,
  });

  // Evo Points Balance
  const { data: evoPointsBalance } = useQuery({
    queryKey: ['evo-points-balance', project?.id],
    queryFn: () => api.get<EvoPointBalance>('/evo-points/me'),
    enabled: !!project?.id,
  });

  // Mutations
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Task> }) =>
      api.patch(`/tasks/${id}`, data),
    // Optimistic update for immediate UI feedback
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['my-tasks'] });
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      
      const previousMyTasks = queryClient.getQueryData<Task[]>(['my-tasks', project?.id]);
      const previousAllTasks = queryClient.getQueryData<TasksResponse>(['tasks', project?.id]);
      
      // Update my-tasks cache
      if (previousMyTasks) {
        queryClient.setQueryData<Task[]>(['my-tasks', project?.id],
          previousMyTasks.map(task =>
            task.id === id ? { ...task, ...data } : task
          )
        );
      }
      
      // Update all-tasks cache
      if (previousAllTasks) {
        queryClient.setQueryData<TasksResponse>(['tasks', project?.id], {
          ...previousAllTasks,
          items: previousAllTasks.items.map(task =>
            task.id === id ? { ...task, ...data } : task
          )
        });
      }
      
      return { previousMyTasks, previousAllTasks };
    },
    onSuccess: () => {
      // Only invalidate the active view to reduce API calls
      if (viewMode === 'my') {
        queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }
    },
    onError: (_err, _params, context) => {
      // Rollback on error
      if (context?.previousMyTasks) {
        queryClient.setQueryData(['my-tasks', project?.id], context.previousMyTasks);
      }
      if (context?.previousAllTasks) {
        queryClient.setQueryData(['tasks', project?.id], context.previousAllTasks);
      }
      toast.error('Failed to update task');
    },
  });

  const startTaskMutation = useMutation({
    mutationFn: (id: number) => api.post<Task>(`/tasks/${id}/start`),
    // Optimistic update - immediately reflect the change in UI
    onMutate: async (taskId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['my-tasks'] });
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      
      // Snapshot the previous value
      const previousMyTasks = queryClient.getQueryData<Task[]>(['my-tasks', project?.id]);
      
      // Optimistically update to the new value
      if (previousMyTasks) {
        queryClient.setQueryData<Task[]>(['my-tasks', project?.id], 
          previousMyTasks.map(task => 
            task.id === taskId 
              ? { ...task, status: 'in_progress' as TaskStatus, start_time: new Date().toISOString() }
              : task
          )
        );
      }
      
      return { previousMyTasks };
    },
    onSuccess: () => {
      toast.success('Task started');
      // Only invalidate the active view
      if (viewMode === 'my') {
        queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }
    },
    onError: (_err, _taskId, context) => {
      // Rollback on error
      if (context?.previousMyTasks) {
        queryClient.setQueryData(['my-tasks', project?.id], context.previousMyTasks);
      }
      toast.error('Failed to start task');
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: (id: number) => api.post<TaskCompletionResponse>(`/tasks/${id}/complete`),
    // Optimistic update
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['my-tasks'] });
      const previousMyTasks = queryClient.getQueryData<Task[]>(['my-tasks', project?.id]);
      
      if (previousMyTasks) {
        queryClient.setQueryData<Task[]>(['my-tasks', project?.id], 
          previousMyTasks.map(task => 
            task.id === taskId 
              ? { ...task, status: 'done' as TaskStatus, end_time: new Date().toISOString() }
              : task
          )
        );
      }
      return { previousMyTasks };
    },
    onSuccess: (data) => {
      if (data.points_earned && data.points_earned > 0) {
        if (data.was_late && data.original_points) {
          toast.success(
            `Task completed! +${data.points_earned} Evo Points (${data.original_points - data.points_earned} reduced for late completion)`
          );
        } else {
          toast.success(`Task completed! +${data.points_earned} Evo Points`);
        }
      } else {
        toast.success('Task completed');
      }
      // Only invalidate active view
      if (viewMode === 'my') {
        queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }
      queryClient.invalidateQueries({ queryKey: ['evo-points-balance'] });
    },
    onError: (_err, _taskId, context) => {
      if (context?.previousMyTasks) {
        queryClient.setQueryData(['my-tasks', project?.id], context.previousMyTasks);
      }
      toast.error('Failed to complete task');
    },
  });

  const revertTaskMutation = useMutation({
    mutationFn: ({ id, targetStatus }: { id: number; targetStatus: 'pending' | 'in_progress' }) =>
      api.post(`/tasks/${id}/revert?target_status=${targetStatus}`),
    onSuccess: () => {
      toast.success('Task reverted successfully');
      // Only invalidate active view
      if (viewMode === 'my') {
        queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }
      queryClient.invalidateQueries({ queryKey: ['evo-points-balance'] });
    },
    onError: () => toast.error('Failed to revert task'),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      toast.success('Task deleted');
      // Only invalidate active view
      if (viewMode === 'my') {
        queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }
    },
    onError: () => toast.error('Failed to delete task'),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskPayload) => api.post('/tasks', data),
    onSuccess: () => {
      toast.success('Task created');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      setShowNewTaskRow(false);
    },
    onError: () => toast.error('Failed to create task'),
  });

  const handleSaveNewTask = (data: any) => {
    const taskData: CreateTaskPayload = {
      title: data.title,
      description: data.description || undefined,
      category_id: data.category_id,
      due_datetime: data.due_datetime || undefined,
      assigned_to_user_id: data.assigned_to_user_id,
    };
    createTaskMutation.mutate(taskData);
  };

  const handleCancelNewTask = () => {
    setShowNewTaskRow(false);
  };

  const handleNewTaskClick = () => {
    setShowNewTaskRow(true);
  };

  // Recurring Template Mutations
  const toggleTemplateMutation = useMutation({
    mutationFn: (id: number) => api.post<RecurringTaskTemplate>(`/tasks/recurring-templates/${id}/toggle`),
    // Optimistic update for instant UI feedback
    onMutate: async (templateId) => {
      await queryClient.cancelQueries({ queryKey: ['recurring-templates'] });
      
      // Get full query key including filters
      const queryKey = ['recurring-templates', project?.id, isProjectAdmin, scheduledStatusFilter, scheduledAssigneeFilter];
      const previousTemplates = queryClient.getQueryData<RecurringTaskTemplate[]>(queryKey);
      
      if (previousTemplates) {
        queryClient.setQueryData<RecurringTaskTemplate[]>(queryKey,
          previousTemplates.map(template =>
            template.id === templateId
              ? { ...template, is_active: !template.is_active }
              : template
          )
        );
      }
      return { previousTemplates, queryKey };
    },
    onSuccess: (data) => {
      toast.success(`Schedule ${data.is_active ? 'enabled' : 'disabled'}`);
      queryClient.invalidateQueries({ queryKey: ['recurring-templates'] });
    },
    onError: (_err, _templateId, context) => {
      if (context?.previousTemplates && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousTemplates);
      }
      toast.error('Failed to toggle schedule');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/tasks/recurring-templates/${id}`),
    // Optimistic update - immediately remove from list
    onMutate: async (templateId) => {
      await queryClient.cancelQueries({ queryKey: ['recurring-templates'] });
      
      const queryKey = ['recurring-templates', project?.id, isProjectAdmin, scheduledStatusFilter, scheduledAssigneeFilter];
      const previousTemplates = queryClient.getQueryData<RecurringTaskTemplate[]>(queryKey);
      
      if (previousTemplates) {
        queryClient.setQueryData<RecurringTaskTemplate[]>(queryKey,
          previousTemplates.filter(template => template.id !== templateId)
        );
      }
      return { previousTemplates, queryKey };
    },
    onSuccess: () => {
      toast.success('Schedule deleted');
      queryClient.invalidateQueries({ queryKey: ['recurring-templates'] });
    },
    onError: (_err, _templateId, context) => {
      if (context?.previousTemplates && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousTemplates);
      }
      toast.error('Failed to delete schedule');
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRecurringTaskTemplatePayload }) =>
      api.patch<RecurringTaskTemplate>(`/tasks/recurring-templates/${id}`, data),
    // Optimistic update
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['recurring-templates'] });
      
      const queryKey = ['recurring-templates', project?.id, isProjectAdmin, scheduledStatusFilter, scheduledAssigneeFilter];
      const previousTemplates = queryClient.getQueryData<RecurringTaskTemplate[]>(queryKey);
      
      if (previousTemplates) {
        queryClient.setQueryData<RecurringTaskTemplate[]>(queryKey,
          previousTemplates.map(template =>
            template.id === id
              ? { ...template, ...data }
              : template
          )
        );
      }
      return { previousTemplates, queryKey };
    },
    onSuccess: () => {
      toast.success('Schedule updated');
      queryClient.invalidateQueries({ queryKey: ['recurring-templates'] });
    },
    onError: (_err, _params, context) => {
      if (context?.previousTemplates && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousTemplates);
      }
      toast.error('Failed to update schedule');
    },
  });

  // Filtered Tasks (for DataTable - no local filtering, let DataTable handle it)
  const tasks = useMemo(() => {
    const source = viewMode === 'my' ? (myTasks || []) : (allTasksData?.items || []);
    return source;
  }, [myTasks, allTasksData, viewMode]);

  // DataTable columns
  const columns = useMemo(() => getColumns({
    categories,
    staffList: staffList || [],
    isAdmin: isProjectAdmin,
    onUpdate: (id, data) => updateTaskMutation.mutate({ id, data }),
    onStart: (id) => startTaskMutation.mutate(id),
    onComplete: (id) => completeTaskMutation.mutate(id),
    onDelete: (id) => deleteTaskMutation.mutate(id),
    onRevert: (id, targetStatus) => revertTaskMutation.mutate({ id, targetStatus }),
  }), [categories, staffList, isProjectAdmin, updateTaskMutation, startTaskMutation, completeTaskMutation, deleteTaskMutation, revertTaskMutation]);

  // Grouped Tasks (for task views - my/all)
  const groupedTasks = useMemo(() => {
    if (viewMode === 'scheduled' || groupBy === 'none') return null;
    
    const groups: Record<string, { label: string; bgColor?: string; tasks: Task[] }> = {};
    
    if (groupBy === 'category') {
      tasks.forEach((task) => {
        const key = task.category_id?.toString() || 'uncategorized';
        if (!groups[key]) {
          const category = categories.find(c => c.id === task.category_id);
          groups[key] = {
            label: task.category_name || 'Uncategorized',
            bgColor: category?.color || '#6B7280',
            tasks: [],
          };
        }
        groups[key].tasks.push(task);
      });
    } else if (groupBy === 'status') {
      const statusOrder = ['pending', 'in_progress', 'done'] as const;
      statusOrder.forEach((status) => {
        const statusTasks = tasks.filter(t => t.status === status);
        if (statusTasks.length > 0) {
          const config = statusConfig[status];
          groups[status] = {
            label: config.label,
            bgColor: config.headerBg,
            tasks: statusTasks,
          };
        }
      });
    } else if (groupBy === 'assignee') {
      tasks.forEach((task) => {
        const key = task.assigned_to_user_id?.toString() || 'unassigned';
        if (!groups[key]) {
          groups[key] = {
            label: task.assigned_user_name || 'Unassigned',
            bgColor: '#6B7280',
            tasks: [],
          };
        }
        groups[key].tasks.push(task);
      });
    }
    
    return groups;
  }, [tasks, groupBy, categories, viewMode]);

  // Grouped Recurring Templates (for scheduled view)
  const groupedTemplates = useMemo(() => {
    if (viewMode !== 'scheduled' || groupBy === 'none') return null;
    
    const groups: Record<string, { label: string; bgColor?: string; templates: RecurringTaskTemplate[] }> = {};
    
    if (groupBy === 'category') {
      recurringTemplates.forEach((template) => {
        const key = template.category_id?.toString() || 'uncategorized';
        if (!groups[key]) {
          const category = categories.find(c => c.id === template.category_id);
          groups[key] = {
            label: template.category_name || 'Uncategorized',
            bgColor: category?.color || '#6B7280',
            templates: [],
          };
        }
        groups[key].templates.push(template);
      });
    } else if (groupBy === 'recurrence') {
      const recurrenceOrder = ['daily', 'weekly', 'once'];
      const recurrenceLabels: Record<string, { label: string; bgColor: string }> = {
        daily: { label: 'Daily', bgColor: '#3B82F6' },
        weekly: { label: 'Weekly', bgColor: '#8B5CF6' },
        once: { label: 'One-time', bgColor: '#F59E0B' },
      };
      recurrenceOrder.forEach((type) => {
        const templates = recurringTemplates.filter(t => t.recurrence_type === type);
        if (templates.length > 0) {
          groups[type] = {
            label: recurrenceLabels[type].label,
            bgColor: recurrenceLabels[type].bgColor,
            templates,
          };
        }
      });
    }
    
    return groups;
  }, [recurringTemplates, groupBy, categories, viewMode]);

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const isLoading = viewMode === 'scheduled' 
    ? loadingTemplates 
    : viewMode === 'my' 
      ? loadingMyTasks 
      : loadingAllTasks;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
              <p className="text-muted-foreground">Manage and track your work</p>
            </div>
            {evoPointsBalance && (
              <div className="flex items-center gap-2 border px-5 py-2.5 rounded-md">
                <span className="text-xl text-muted-foreground">Evo Points</span>
                <span className="text-xl font-semibold">{evoPointsBalance.current_balance.toLocaleString()}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isProjectAdmin && (
              <Button variant="outline" onClick={() => setShowCategoryManager(true)}>
                <Settings2 className="h-4 w-4 mr-2" />
                Categories
              </Button>
            )}
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            {/* View Mode Dropdown */}
            <Select value={viewMode} onValueChange={(v) => {
              const newMode = v as ViewMode;
              setViewMode(newMode);
              // Reset groupBy when switching to non-scheduled view
              if (newMode !== 'scheduled') {
                setGroupBy('none');
              }
            }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="my">My Tasks</SelectItem>
                {isProjectAdmin && <SelectItem value="all">All Tasks</SelectItem>}
                <SelectItem value="scheduled">Scheduled Tasks</SelectItem>
              </SelectContent>
            </Select>

            {/* Scheduled Tasks Filters */}
            {viewMode === 'scheduled' && (
              <>
                {/* Status Filter for Schedules */}
                <Select value={scheduledStatusFilter} onValueChange={(v) => setScheduledStatusFilter(v as 'all' | 'active' | 'inactive')}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                {/* Assignee Filter for Schedules (Admin only) */}
                {isProjectAdmin && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[180px] justify-start">
                        <User className="h-4 w-4 mr-2" />
                        {scheduledAssigneeFilter 
                          ? staffList?.find(s => s.id === scheduledAssigneeFilter)?.name || 'Selected'
                          : 'All Assignees'
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search staff..." />
                        <CommandList>
                          <CommandEmpty>No staff found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem onSelect={() => setScheduledAssigneeFilter(null)}>
                              <span>All Assignees</span>
                            </CommandItem>
                            {staffList?.map((staff) => (
                              <CommandItem key={staff.id} onSelect={() => setScheduledAssigneeFilter(staff.id)}>
                                <span>{staff.name}</span>
                                {scheduledAssigneeFilter === staff.id && <Check className="ml-auto h-4 w-4" />}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}

                {/* Group By - for scheduled view */}
                <Select value={groupBy} onValueChange={(v) => {
                  setGroupBy(v as GroupByOption);
                  setCollapsedGroups(new Set());
                }}>
                  <SelectTrigger className="w-[150px]">
                    <Layers className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Grouping</SelectItem>
                    <SelectItem value="category">By Category</SelectItem>
                    <SelectItem value="recurrence">By Recurrence</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}

            {/* Group By - for task views (my/all) */}
            {viewMode !== 'scheduled' && (
              <Select value={groupBy} onValueChange={(v) => {
                setGroupBy(v as GroupByOption);
                setCollapsedGroups(new Set());
              }}>
                <SelectTrigger className="w-[150px]">
                  <Layers className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Grouping</SelectItem>
                  <SelectItem value="status">By Status</SelectItem>
                  <SelectItem value="category">By Category</SelectItem>
                  {viewMode === 'all' && isProjectAdmin && <SelectItem value="assignee">By Assignee</SelectItem>}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Tables */}
        {viewMode === 'scheduled' ? (
          // Scheduled Tasks View
          isLoading ? (
            <Card>
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </Card>
          ) : recurringTemplates.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center gap-2 text-muted-foreground py-16">
                <Repeat className="h-8 w-8" />
                <span>No scheduled tasks found</span>
                <Button variant="outline" size="sm" onClick={() => setShowAddTask(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create a recurring task
                </Button>
              </div>
            </Card>
          ) : groupBy !== 'none' && groupedTemplates ? (
            // Grouped view for scheduled tasks
            <div className="space-y-4">
              {Object.entries(groupedTemplates).map(([groupKey, group]) => (
                <div key={groupKey}>
                  {/* Group Header */}
                  <div 
                    className="flex items-center gap-2 py-2 px-3 rounded-t-lg border border-b-0 cursor-pointer transition-colors"
                    style={{ backgroundColor: group.bgColor || '#6B7280' }}
                    onClick={() => toggleGroup(groupKey)}
                  >
                    {collapsedGroups.has(groupKey) ? (
                      <ChevronRight className="h-5 w-5 text-white" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-white" />
                    )}
                    <span className="font-semibold text-base text-white">
                      {group.label}
                    </span>
                    <Badge variant="secondary" className="ml-2 bg-white/20 text-white hover:bg-white/30">
                      {group.templates.length} {group.templates.length === 1 ? 'schedule' : 'schedules'}
                    </Badge>
                  </div>
                  
                  {/* Group Table */}
                  {!collapsedGroups.has(groupKey) && (
                    <Card className="rounded-t-none border-t-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[250px]">Title</TableHead>
                            <TableHead className="w-[150px]">Recurrence</TableHead>
                            <TableHead className="w-[150px]">Assigned To</TableHead>
                            <TableHead className="w-[120px]">Category</TableHead>
                            <TableHead className="w-[100px]">Status</TableHead>
                            <TableHead className="w-[100px] text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.templates.map((template) => (
                            <TableRow 
                              key={template.id} 
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setEditingTemplate(template)}
                            >
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">{template.title}</span>
                                  {template.description && (
                                    <span className="text-sm text-muted-foreground truncate max-w-[230px]">
                                      {template.description}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-0.5">
                                  <Badge variant="outline" className="w-fit capitalize">
                                    {template.recurrence_type}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {template.recurrence_description || (
                                      template.recurrence_type === 'once' 
                                        ? template.scheduled_date 
                                        : template.days_of_week?.split(',').map(d => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][parseInt(d)]).join(', ')
                                    )}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">{template.assigned_user_name || '-'}</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">{template.category_name || '-'}</span>
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={template.is_active}
                                    onCheckedChange={() => toggleTemplateMutation.mutate(template.id)}
                                  />
                                  <span className={cn(
                                    "text-xs",
                                    template.is_active ? "text-green-600" : "text-muted-foreground"
                                  )}>
                                    {template.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setEditingTemplate(template)}>
                                      <Edit3 className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => {
                                        if (confirm('Are you sure you want to delete this scheduled task?')) {
                                          deleteTemplateMutation.mutate(template.id);
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Title</TableHead>
                    <TableHead className="w-[150px]">Recurrence</TableHead>
                    <TableHead className="w-[150px]">Assigned To</TableHead>
                    <TableHead className="w-[120px]">Category</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recurringTemplates.map((template) => (
                    <TableRow 
                      key={template.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setEditingTemplate(template)}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{template.title}</span>
                          {template.description && (
                            <span className="text-sm text-muted-foreground truncate max-w-[230px]">
                              {template.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="outline" className="w-fit capitalize">
                            {template.recurrence_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {template.recurrence_description || (
                              template.recurrence_type === 'once' 
                                ? template.scheduled_date 
                                : template.days_of_week?.split(',').map(d => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][parseInt(d)]).join(', ')
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{template.assigned_user_name || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{template.category_name || '-'}</span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={template.is_active}
                            onCheckedChange={() => toggleTemplateMutation.mutate(template.id)}
                          />
                          <span className={cn(
                            "text-xs",
                            template.is_active ? "text-green-600" : "text-muted-foreground"
                          )}>
                            {template.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingTemplate(template)}>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this scheduled task?')) {
                                  deleteTemplateMutation.mutate(template.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )
        ) : groupBy !== 'none' && groupedTasks ? (
          // Grouped view for task views (my/all)
          <div className="space-y-4">
            {Object.entries(groupedTasks).map(([groupKey, group]) => (
              <div key={groupKey}>
                {/* Group Header */}
                <div 
                  className="flex items-center gap-2 py-2 px-3 rounded-t-lg border border-b-0 cursor-pointer transition-colors"
                  style={{ backgroundColor: group.bgColor || '#6B7280' }}
                  onClick={() => toggleGroup(groupKey)}
                >
                  {collapsedGroups.has(groupKey) ? (
                    <ChevronRight className="h-5 w-5 text-white" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-white" />
                  )}
                  <span className="font-semibold text-base text-white">
                    {group.label}
                  </span>
                  <Badge variant="secondary" className="ml-2 bg-white/20 text-white hover:bg-white/30">
                    {group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'}
                  </Badge>
                </div>
                
                {/* Group Table */}
                {!collapsedGroups.has(groupKey) && (
                  <Card className="rounded-t-none border-t-0">
                    <DataTable
                      columns={columns}
                      data={group.tasks}
                      filterableColumns={[]}
                      searchableColumns={[{ id: "title", title: "tasks" }]}
                    />
                  </Card>
                )}
              </div>
            ))}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={tasks}
            filterableColumns={[
              { id: "status", title: "Status", options: statusFilterOptions },
              { id: "category_name", title: "Category", options: getCategoryFilterOptions(tasks) },
              ...(viewMode === 'all' && isProjectAdmin ? [{ id: "assigned_user_name", title: "Assignee", options: getAssigneeFilterOptions(tasks) }] : []),
            ]}
            searchableColumns={[{ id: "title", title: "tasks" }]}
            dateFilterColumnId="due_datetime"
            showNewTaskRow={showNewTaskRow}
            onSaveNewTask={handleSaveNewTask}
            onCancelNewTask={handleCancelNewTask}
            categories={categories}
            staffList={isProjectAdmin ? staffList : []}
            onNewTaskClick={handleNewTaskClick}
          />
        )}
      </div>

      {/* Dialogs */}
      <AddTaskDialog
        open={showAddTask}
        onOpenChange={setShowAddTask}
        categories={categories}
        staffList={isProjectAdmin ? staffList : undefined}
      />
      <CategoryManagerDialog
        open={showCategoryManager}
        onOpenChange={setShowCategoryManager}
        categories={categories}
      />
      <EditRecurringTemplateDialog
        open={!!editingTemplate}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
        template={editingTemplate}
        categories={categories}
        staffList={isProjectAdmin ? staffList : undefined}
        onSave={(data) => {
          if (editingTemplate) {
            updateTemplateMutation.mutate({ id: editingTemplate.id, data }, {
              onSuccess: () => setEditingTemplate(null),
            });
          }
        }}
        isSaving={updateTemplateMutation.isPending}
      />
    </MainLayout>
  );
}
