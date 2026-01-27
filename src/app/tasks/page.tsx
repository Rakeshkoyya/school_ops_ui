'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout';
import { api } from '@/lib/api-client';
import { useProject } from '@/contexts/project-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Search,
  Clock,
  MoreHorizontal,
  Play,
  CheckCircle2,
  Calendar,
  Tag,
  Trash2,
  Edit3,
  Filter,
  SortAsc,
  Settings2,
  ChevronDown,
  ChevronRight,
  Circle,
  Timer,
  Folder,
  X,
  Check,
  GripVertical,
  User,
  Layers,
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
} from '@/types';
import { format, formatDistanceToNow, differenceInSeconds } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ==================== Types ====================

type GroupByOption = 'none' | 'category' | 'status';

interface TasksResponse {
  items: Task[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ==================== Status Config ====================

const statusConfig: Record<TaskStatus, { label: string; color: string; icon: React.ReactNode; bg: string; headerBg: string }> = {
  pending: {
    label: 'To Do',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    headerBg: '#6B7280',
    icon: <Circle className="h-3.5 w-3.5" />,
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    headerBg: '#3B82F6',
    icon: <Play className="h-3.5 w-3.5 fill-current" />,
  },
  done: {
    label: 'Done',
    color: 'text-green-600',
    bg: 'bg-green-100',
    headerBg: '#22C55E',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  overdue: {
    label: 'Overdue',
    color: 'text-red-600',
    bg: 'bg-red-100',
    headerBg: '#EF4444',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-gray-400',
    bg: 'bg-gray-50',
    headerBg: '#9CA3AF',
    icon: <X className="h-3.5 w-3.5" />,
  },
};

// ==================== Countdown Timer Component ====================

function CountdownTimer({ dueDate }: { dueDate: string }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    // Parse the due date and set to 00:00:00 of that day
    const dueDateObj = new Date(dueDate);
    dueDateObj.setHours(0, 0, 0, 0);
    const dueTimestamp = dueDateObj.getTime();

    const updateRemaining = () => {
      const now = Date.now();
      const diff = Math.floor((dueTimestamp - now) / 1000);
      setRemaining(diff);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [dueDate]);

  const isOverdue = remaining < 0;
  const absRemaining = Math.abs(remaining);
  
  const days = Math.floor(absRemaining / 86400);
  const hours = Math.floor((absRemaining % 86400) / 3600);
  const minutes = Math.floor((absRemaining % 3600) / 60);
  const seconds = absRemaining % 60;

  // Format: show days if > 0, otherwise show HH:MM:SS
  let display = '';
  if (days > 0) {
    display = `${days}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  } else {
    display = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return (
    <span className={cn('text-xs font-mono tabular-nums', isOverdue ? 'text-red-600' : 'text-gray-600')}>
      {isOverdue ? '-' : ''}{display}
    </span>
  );
}

// ==================== Elapsed Timer Component ====================

function ElapsedTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startTime).getTime();
    const updateElapsed = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  return (
    <div className="flex items-center gap-1.5 text-blue-600">
      <Timer className="h-3.5 w-3.5 animate-pulse" />
      <span className="text-xs font-mono tabular-nums">
        {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
}

// ==================== Status Badge Component ====================

function StatusBadge({ status, isOverdue }: { status: TaskStatus; isOverdue?: boolean }) {
  const displayStatus = isOverdue && status !== 'done' ? 'overdue' : status;
  const config = statusConfig[displayStatus];

  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium', config.bg, config.color)}>
      {config.icon}
      <span>{config.label}</span>
    </div>
  );
}

// ==================== Inline Edit Cell ====================

function InlineEditCell({
  value,
  onSave,
  className,
}: {
  value: string;
  onSave: (value: string) => void;
  className?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    if (editValue !== value) {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') {
            setEditValue(value);
            setIsEditing(false);
          }
        }}
        className="h-7 text-sm"
        autoFocus
      />
    );
  }

  return (
    <span
      className={cn('cursor-text hover:bg-gray-50 px-1 py-0.5 rounded', className)}
      onClick={() => setIsEditing(true)}
    >
      {value || <span className="text-gray-400 italic">Empty</span>}
    </span>
  );
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
    mutationFn: (data: { name: string; color: string }) => api.post('/tasks/categories', data),
    onSuccess: () => {
      toast.success('Category created');
      queryClient.invalidateQueries({ queryKey: ['task-categories'] });
      setNewCategoryName('');
      setNewCategoryColor('#3B82F6');
    },
    onError: () => toast.error('Failed to create category'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, color }: { id: number; name: string; color: string }) =>
      api.patch(`/tasks/categories/${id}`, { name, color }),
    onSuccess: () => {
      toast.success('Category updated');
      queryClient.invalidateQueries({ queryKey: ['task-categories'] });
      setEditingId(null);
    },
    onError: () => toast.error('Failed to update category'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/tasks/categories/${id}`),
    onSuccess: () => {
      toast.success('Category deleted');
      queryClient.invalidateQueries({ queryKey: ['task-categories'] });
    },
    onError: () => toast.error('Failed to delete category'),
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
  const [formData, setFormData] = useState<CreateTaskPayload>({
    title: '',
    description: '',
    category_id: undefined,
    due_date: '',
    assigned_to_user_id: undefined,
  });
  const queryClient = useQueryClient();

  // Update assigned_to_user_id when preselectedAssignee changes
  useEffect(() => {
    if (preselectedAssignee) {
      setFormData(prev => ({ ...prev, assigned_to_user_id: preselectedAssignee.id }));
    }
  }, [preselectedAssignee, open]);

  const createMutation = useMutation({
    mutationFn: (data: CreateTaskPayload) => api.post('/tasks', data),
    onSuccess: () => {
      toast.success(preselectedAssignee ? 'Task assigned' : 'Task created');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      onOpenChange(false);
      setFormData({ title: '', description: '', category_id: undefined, due_date: '', assigned_to_user_id: undefined });
    },
    onError: () => toast.error(preselectedAssignee ? 'Failed to assign task' : 'Failed to create task'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}>
          <DialogHeader>
            <DialogTitle>
              {preselectedAssignee 
                ? `Assign Task to ${preselectedAssignee.name}` 
                : 'Create New Task'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="What needs to be done?"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add more details..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={formData.category_id?.toString() || '__none__'}
                  onValueChange={(v) => setFormData({ ...formData, category_id: v === '__none__' ? undefined : parseInt(v) })}
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
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>

            {/* Show assignee selector only when not preselected */}
            {!preselectedAssignee && staffList && staffList.length > 0 && (
              <div className="grid gap-2">
                <Label>Assign To</Label>
                <Select
                  value={formData.assigned_to_user_id?.toString() || '__none__'}
                  onValueChange={(v) => setFormData({ ...formData, assigned_to_user_id: v === '__none__' ? undefined : parseInt(v) })}
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !formData.title.trim()}>
              {createMutation.isPending 
                ? (preselectedAssignee ? 'Assigning...' : 'Creating...') 
                : (preselectedAssignee ? 'Assign Task' : 'Create Task')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Task Row Component ====================

function TaskRow({
  task,
  categories,
  staffList,
  isAdmin,
  isAdminAssigned,
  onUpdate,
  onDelete,
  onStart,
  onComplete,
}: {
  task: Task;
  categories: TaskCategory[];
  staffList?: StaffMember[];
  isAdmin?: boolean;
  isAdminAssigned?: boolean;
  onUpdate: (id: number, data: Partial<Task>) => void;
  onDelete: (id: number) => void;
  onStart: (id: number) => void;
  onComplete: (id: number) => void;
}) {
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const displayStatus = task.is_overdue && task.status !== 'done' ? 'overdue' : task.status;
  const isCompleted = task.status === 'done';

  return (
    <TableRow className={cn(
      'group',
      isCompleted && 'opacity-60',
      isAdminAssigned && !isCompleted && 'bg-blue-100/60 hover:bg-blue-50'
    )}>
      {/* Checkbox */}
      <TableCell className="w-10">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={(checked) => {
            if (checked) onComplete(task.id);
          }}
          disabled={isCompleted}
        />
      </TableCell>

      {/* Title */}
      <TableCell className="font-medium min-w-[200px]">
        <div className={cn(isCompleted && 'line-through text-gray-400')}>
          {task.title}
        </div>
        {task.description && (
          <div className="text-xs text-muted-foreground truncate max-w-[300px]">
            {task.description}
          </div>
        )}
      </TableCell>

      {/* Status */}
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="focus:outline-none">
              <StatusBadge status={task.status} isOverdue={task.is_overdue} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {Object.entries(statusConfig).map(([key, config]) => (
              <DropdownMenuItem
                key={key}
                onClick={() => {
                  if (key === 'in_progress') onStart(task.id);
                  else if (key === 'done') onComplete(task.id);
                }}
                disabled={key === 'overdue'}
              >
                <span className={cn('flex items-center gap-2', config.color)}>
                  {config.icon}
                  {config.label}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>

      {/* Category */}
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="focus:outline-none">
              {task.category_name ? (
                <Badge variant="secondary" className="font-normal">
                  <Tag className="h-3 w-3 mr-1" />
                  {task.category_name}
                </Badge>
              ) : (
                <span className="text-xs text-gray-400 hover:text-gray-600">+ Add</span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onUpdate(task.id, { category_id: undefined })}>
              <span className="text-gray-500">No category</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {categories.map((cat) => (
              <DropdownMenuItem key={cat.id} onClick={() => onUpdate(task.id, { category_id: cat.id })}>
                <Tag className="h-3.5 w-3.5 mr-2 text-gray-400" />
                {cat.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>

      {/* Created On */}
      <TableCell>
        <span className="text-sm text-gray-600">
          {format(new Date(task.created_at), 'MMM d, yyyy')}
        </span>
      </TableCell>

      {/* Created By */}
      <TableCell>
        {task.created_by_name ? (
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
              {task.created_by_name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm">{task.created_by_name}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </TableCell>

      {/* Assigned To - Editable for Admin */}
      <TableCell>
        {isAdmin && staffList ? (
          <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
            <PopoverTrigger asChild>
              <button className="focus:outline-none text-left">
                {task.assigned_user_name ? (
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                      {task.assigned_user_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm hover:text-blue-600">{task.assigned_user_name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 hover:text-blue-600">+ Assign</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search staff..." />
                <CommandList>
                  <CommandEmpty>No staff found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="__unassign__"
                      onSelect={() => {
                        onUpdate(task.id, { assigned_to_user_id: undefined });
                        setAssigneePopoverOpen(false);
                      }}
                    >
                      <span className="text-gray-500">Unassign</span>
                    </CommandItem>
                    {staffList.map((staff) => (
                      <CommandItem
                        key={staff.id}
                        value={staff.name}
                        onSelect={() => {
                          onUpdate(task.id, { assigned_to_user_id: staff.id });
                          setAssigneePopoverOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                            {staff.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm">{staff.name}</span>
                            <span className="text-xs text-muted-foreground">{staff.email}</span>
                          </div>
                        </div>
                        {task.assigned_to_user_id === staff.id && (
                          <Check className="ml-auto h-4 w-4" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        ) : task.assigned_user_name ? (
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
              {task.assigned_user_name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm">{task.assigned_user_name}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </TableCell>

      {/* Due Date */}
      <TableCell>
        {task.due_date ? (
          <span className={cn('text-sm', task.is_overdue && 'text-red-600 font-medium')}>
            {format(new Date(task.due_date), 'MMM d, yyyy')}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </TableCell>

      {/* Timer */}
      <TableCell>
        {task.due_date ? (
          <CountdownTimer dueDate={task.due_date} />
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell className="w-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {task.status === 'pending' && (
              <DropdownMenuItem onClick={() => onStart(task.id)}>
                <Play className="h-4 w-4 mr-2" />
                Start Task
              </DropdownMenuItem>
            )}
            {task.status !== 'done' && (
              <DropdownMenuItem onClick={() => onComplete(task.id)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// ==================== Main Page Component ====================

export default function TasksPage() {
  const { project, isProjectAdmin } = useProject();
  const queryClient = useQueryClient();
  
  // UI State
  const [showAddTask, setShowAddTask] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
  const [viewMode, setViewMode] = useState<'my' | 'all'>('my');
  const [selectedAssignee, setSelectedAssignee] = useState<StaffMember | null>(null);
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
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
    queryKey: ['tasks', project?.id, statusFilter, categoryFilter, selectedAssignee?.id],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category_id', categoryFilter.toString());
      if (selectedAssignee) params.append('assigned_to_user_id', selectedAssignee.id.toString());
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

  const { data: staffList } = useQuery({
    queryKey: ['admin-staff'],
    queryFn: () => api.get<StaffMember[]>('/tasks/admin/staff'),
    enabled: !!project?.id && isProjectAdmin,
  });

  // Mutations
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Task> }) =>
      api.patch(`/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => toast.error('Failed to update task'),
  });

  const startTaskMutation = useMutation({
    mutationFn: (id: number) => api.post(`/tasks/${id}/start`),
    onSuccess: () => {
      toast.success('Task started');
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => toast.error('Failed to start task'),
  });

  const completeTaskMutation = useMutation({
    mutationFn: (id: number) => api.post(`/tasks/${id}/complete`),
    onSuccess: () => {
      toast.success('Task completed');
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => toast.error('Failed to complete task'),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      toast.success('Task deleted');
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => toast.error('Failed to delete task'),
  });

  // Filtered Tasks
  const tasks = useMemo(() => {
    const source = viewMode === 'my' ? (myTasks || []) : (allTasksData?.items || []);
    
    return source.filter((task) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!task.title.toLowerCase().includes(q) && !task.description?.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (viewMode === 'my') {
        if (statusFilter !== 'all' && task.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && task.category_id !== categoryFilter) return false;
      }
      return true;
    });
  }, [myTasks, allTasksData, viewMode, searchQuery, statusFilter, categoryFilter]);

  // Grouped Tasks
  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') return null;
    
    const groups: Record<string, { label: string; color?: string; bgColor?: string; tasks: Task[] }> = {};
    
    if (groupBy === 'category') {
      // Group by category - use category color
      tasks.forEach((task) => {
        const key = task.category_id?.toString() || 'uncategorized';
        if (!groups[key]) {
          // Find the category to get its color
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
      // Group by status
      const statusOrder = ['pending', 'in_progress', 'done'];
      statusOrder.forEach((status) => {
        const statusTasks = tasks.filter((t) => t.status === status);
        if (statusTasks.length > 0) {
          const config = statusConfig[status as TaskStatus];
          groups[status] = {
            label: config.label,
            bgColor: config.headerBg,
            tasks: statusTasks,
          };
        }
      });
    }
    
    return groups;
  }, [tasks, groupBy, categories]);

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

  const isLoading = viewMode === 'my' ? loadingMyTasks : loadingAllTasks;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
            <p className="text-muted-foreground">Manage and track your work</p>
          </div>
          <div className="flex items-center gap-2">
            {isProjectAdmin && (
              <Button variant="outline" onClick={() => setShowCategoryManager(true)}>
                <Settings2 className="h-4 w-4 mr-2" />
                Categories
              </Button>
            )}
            <Button onClick={() => setShowAddTask(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {selectedAssignee ? 'Assign Task' : 'New Task'}
            </Button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('my')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  viewMode === 'my' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                )}
              >
                My Tasks
              </button>
              {isProjectAdmin && (
                <button
                  onClick={() => setViewMode('all')}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    viewMode === 'all' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  All Tasks
                </button>
              )}
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TaskStatus | 'all')}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select
              value={categoryFilter === 'all' ? 'all' : categoryFilter.toString()}
              onValueChange={(v) => setCategoryFilter(v === 'all' ? 'all' : parseInt(v))}
            >
              <SelectTrigger className="w-[160px]">
                <Tag className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Assignee Filter */}
            {isProjectAdmin && viewMode === 'all' && (
              <div className="flex items-center gap-1">
                <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={selectedAssignee ? "w-[150px] justify-start" : "w-[180px] justify-start"}>
                      <User className="h-4 w-4 mr-2" />
                      {selectedAssignee ? (
                        <span className="truncate">{selectedAssignee.name}</span>
                      ) : (
                        <span className="text-muted-foreground">Select Assignee</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search staff..." />
                    <CommandList>
                      <CommandEmpty>No staff found.</CommandEmpty>
                      <CommandGroup>
                        {staffList?.map((staff) => (
                          <CommandItem
                            key={staff.id}
                            value={staff.name}
                            onSelect={() => {
                              setSelectedAssignee(staff);
                              setAssigneePopoverOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                                {staff.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm">{staff.name}</span>
                                <span className="text-xs text-muted-foreground">{staff.email}</span>
                              </div>
                            </div>
                            {selectedAssignee?.id === staff.id && (
                              <Check className="ml-auto h-4 w-4" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedAssignee && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSelectedAssignee(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              </div>
            )}
          </div>

          {/* Search and Group By */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Group By */}
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
                <SelectItem value="status">By Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tables */}
        {isLoading ? (
          <Card>
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </Card>
        ) : tasks.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center gap-2 text-muted-foreground py-16">
              <CheckCircle2 className="h-8 w-8" />
              <span>No tasks found</span>
              <Button variant="outline" size="sm" onClick={() => setShowAddTask(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create your first task
              </Button>
            </div>
          </Card>
        ) : groupBy !== 'none' && groupedTasks ? (
          // Grouped view - separate tables for each group
          <div className="space-y-4">
            {Object.entries(groupedTasks).map(([groupKey, group]) => (
              <div key={groupKey}>
                {/* Group Header */}
                <div 
                  className={cn(
                    "flex items-center gap-2 py-2 px-3 rounded-t-lg border border-b-0 cursor-pointer transition-colors",
                    !group.bgColor && "bg-gray-100 hover:bg-gray-200"
                  )}
                  style={group.bgColor ? { backgroundColor: group.bgColor } : undefined}
                  onClick={() => toggleGroup(groupKey)}
                >
                  {collapsedGroups.has(groupKey) ? (
                    <ChevronRight className={cn("h-5 w-5", group.bgColor ? "text-white" : "text-gray-500")} />
                  ) : (
                    <ChevronDown className={cn("h-5 w-5", group.bgColor ? "text-white" : "text-gray-500")} />
                  )}
                  <span className={cn(
                    'font-semibold text-base', 
                    group.bgColor ? 'text-white' : group.color
                  )}>
                    {group.label}
                  </span>
                  <Badge variant="secondary" className={cn("ml-2", group.bgColor && "bg-white/20 text-white hover:bg-white/30")}>
                    {group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'}
                  </Badge>
                </div>
                
                {/* Group Table */}
                {!collapsedGroups.has(groupKey) && (
                  <Card className="rounded-t-none border-t-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-10"></TableHead>
                          <TableHead>Task</TableHead>
                          <TableHead className="w-[120px]">Status</TableHead>
                          <TableHead className="w-[140px]">Category</TableHead>
                          <TableHead className="w-[110px]">Created On</TableHead>
                          <TableHead className="w-[120px]">Created By</TableHead>
                          <TableHead className="w-[150px]">Assignee</TableHead>
                          <TableHead className="w-[110px]">Due Date</TableHead>
                          <TableHead className="w-[80px]">Timer</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.tasks.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            categories={categories}
                            staffList={staffList}
                            isAdmin={isProjectAdmin}
                            isAdminAssigned={task.created_by_id !== task.assigned_to_user_id}
                            onUpdate={(id, data) => updateTaskMutation.mutate({ id, data })}
                            onDelete={(id) => deleteTaskMutation.mutate(id)}
                            onStart={(id) => startTaskMutation.mutate(id)}
                            onComplete={(id) => completeTaskMutation.mutate(id)}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Flat view - single table
          <Card>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[140px]">Category</TableHead>
                  <TableHead className="w-[110px]">Created On</TableHead>
                  <TableHead className="w-[120px]">Created By</TableHead>
                  <TableHead className="w-[150px]">Assignee</TableHead>
                  <TableHead className="w-[110px]">Due Date</TableHead>
                  <TableHead className="w-[80px]">Timer</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    categories={categories}
                    staffList={staffList}
                    isAdmin={isProjectAdmin}
                    isAdminAssigned={task.created_by_id !== task.assigned_to_user_id}
                    onUpdate={(id, data) => updateTaskMutation.mutate({ id, data })}
                    onDelete={(id) => deleteTaskMutation.mutate(id)}
                    onStart={(id) => startTaskMutation.mutate(id)}
                    onComplete={(id) => completeTaskMutation.mutate(id)}
                  />
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <AddTaskDialog
        open={showAddTask}
        onOpenChange={setShowAddTask}
        categories={categories}
        staffList={isProjectAdmin ? staffList : undefined}
        preselectedAssignee={selectedAssignee}
      />
      <CategoryManagerDialog
        open={showCategoryManager}
        onOpenChange={setShowCategoryManager}
        categories={categories}
      />
    </MainLayout>
  );
}
