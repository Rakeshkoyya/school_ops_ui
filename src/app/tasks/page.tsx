'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Circle,
  Timer,
  Folder,
  X,
  Check,
  GripVertical,
} from 'lucide-react';
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

interface TasksResponse {
  items: Task[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ==================== Status Config ====================

const statusConfig: Record<TaskStatus, { label: string; color: string; icon: React.ReactNode; bg: string }> = {
  pending: {
    label: 'To Do',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    icon: <Circle className="h-3.5 w-3.5" />,
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    icon: <Play className="h-3.5 w-3.5 fill-current" />,
  },
  done: {
    label: 'Done',
    color: 'text-green-600',
    bg: 'bg-green-100',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  overdue: {
    label: 'Overdue',
    color: 'text-red-600',
    bg: 'bg-red-100',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-gray-400',
    bg: 'bg-gray-50',
    icon: <X className="h-3.5 w-3.5" />,
  },
};

// ==================== Countdown Timer Component ====================

function CountdownTimer({ dueDate, timeRemaining }: { dueDate: string; timeRemaining?: number }) {
  const [remaining, setRemaining] = useState(timeRemaining ?? 0);

  useEffect(() => {
    if (timeRemaining === undefined) return;
    setRemaining(timeRemaining);
    const interval = setInterval(() => setRemaining((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timeRemaining]);

  const isOverdue = remaining < 0;
  const absRemaining = Math.abs(remaining);
  const days = Math.floor(absRemaining / 86400);
  const hours = Math.floor((absRemaining % 86400) / 3600);
  const minutes = Math.floor((absRemaining % 3600) / 60);

  let display = '';
  if (days > 0) display = `${days}d ${hours}h`;
  else if (hours > 0) display = `${hours}h ${minutes}m`;
  else display = `${minutes}m`;

  return (
    <span className={cn('text-xs font-mono', isOverdue ? 'text-red-600' : 'text-gray-500')}>
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post('/tasks/categories', { name }),
    onSuccess: () => {
      toast.success('Category created');
      queryClient.invalidateQueries({ queryKey: ['task-categories'] });
      setNewCategoryName('');
    },
    onError: () => toast.error('Failed to create category'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      api.patch(`/tasks/categories/${id}`, { name }),
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
          <div className="flex gap-2">
            <Input
              placeholder="New category name..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCategoryName.trim()) {
                  createMutation.mutate(newCategoryName.trim());
                }
              }}
            />
            <Button
              size="sm"
              onClick={() => newCategoryName.trim() && createMutation.mutate(newCategoryName.trim())}
              disabled={!newCategoryName.trim() || createMutation.isPending}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Category list */}
          <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
            {categories.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No categories yet. Create one above.
              </div>
            ) : (
              categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                  {editingId === category.id ? (
                    <div className="flex items-center gap-2 flex-1">
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
                            updateMutation.mutate({ id: category.id, name: editValue.trim() });
                          }
                        }}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4 text-gray-500" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(category.id);
                            setEditValue(category.name);
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
                    </>
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: TaskCategory[];
  staffList?: StaffMember[];
}) {
  const [formData, setFormData] = useState<CreateTaskPayload>({
    title: '',
    description: '',
    category_id: undefined,
    due_date: '',
    assigned_to_user_id: undefined,
  });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateTaskPayload) => api.post('/tasks', data),
    onSuccess: () => {
      toast.success('Task created');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      onOpenChange(false);
      setFormData({ title: '', description: '', category_id: undefined, due_date: '', assigned_to_user_id: undefined });
    },
    onError: () => toast.error('Failed to create task'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
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

            {staffList && staffList.length > 0 && (
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !formData.title.trim()}>
              {createMutation.isPending ? 'Creating...' : 'Create Task'}
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
  onUpdate,
  onDelete,
  onStart,
  onComplete,
}: {
  task: Task;
  categories: TaskCategory[];
  onUpdate: (id: number, data: Partial<Task>) => void;
  onDelete: (id: number) => void;
  onStart: (id: number) => void;
  onComplete: (id: number) => void;
}) {
  const displayStatus = task.is_overdue && task.status !== 'done' ? 'overdue' : task.status;
  const isCompleted = task.status === 'done';

  return (
    <TableRow className={cn('group', isCompleted && 'opacity-60')}>
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

      {/* Due Date */}
      <TableCell>
        {task.due_date ? (
          <div className="flex flex-col">
            <span className={cn('text-sm', task.is_overdue && 'text-red-600 font-medium')}>
              {format(new Date(task.due_date), 'MMM d')}
            </span>
            {!isCompleted && task.time_remaining_seconds !== undefined && (
              <CountdownTimer dueDate={task.due_date} timeRemaining={task.time_remaining_seconds} />
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </TableCell>

      {/* Assigned To */}
      <TableCell>
        {task.assigned_user_name ? (
          <span className="text-sm">{task.assigned_user_name}</span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </TableCell>

      {/* Timer */}
      <TableCell>
        {task.start_time && !task.end_time ? (
          <ElapsedTimer startTime={task.start_time} />
        ) : task.end_time && task.elapsed_seconds !== undefined ? (
          <span className="text-xs text-gray-500 font-mono">
            {String(Math.floor(task.elapsed_seconds / 3600)).padStart(2, '0')}:
            {String(Math.floor((task.elapsed_seconds % 3600) / 60)).padStart(2, '0')}:
            {String(task.elapsed_seconds % 60).padStart(2, '0')}
          </span>
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

  // Data Queries
  const { data: myTasks, isLoading: loadingMyTasks } = useQuery({
    queryKey: ['my-tasks', project?.id],
    queryFn: () => api.get<Task[]>('/tasks/my-tasks'),
    enabled: !!project?.id,
    refetchInterval: 30000,
  });

  const { data: allTasksData, isLoading: loadingAllTasks } = useQuery({
    queryKey: ['tasks', project?.id, statusFilter, categoryFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category_id', categoryFilter.toString());
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

  // Stats
  const stats = useMemo(() => {
    const source = myTasks || [];
    return {
      total: source.length,
      pending: source.filter((t) => t.status === 'pending').length,
      inProgress: source.filter((t) => t.status === 'in_progress').length,
      done: source.filter((t) => t.status === 'done').length,
      overdue: source.filter((t) => t.is_overdue && t.status !== 'done').length,
    };
  }, [myTasks]);

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
            <Button variant="outline" onClick={() => setShowCategoryManager(true)}>
              <Settings2 className="h-4 w-4 mr-2" />
              Categories
            </Button>
            <Button onClick={() => setShowAddTask(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card className="cursor-pointer hover:bg-gray-50" onClick={() => setStatusFilter('all')}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-gray-50" onClick={() => setStatusFilter('pending')}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
              <div className="text-xs text-muted-foreground">To Do</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-gray-50" onClick={() => setStatusFilter('in_progress')}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-red-50" onClick={() => setStatusFilter('overdue')}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <div className="text-xs text-muted-foreground">Overdue</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-green-50" onClick={() => setStatusFilter('done')}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.done}</div>
              <div className="text-xs text-muted-foreground">Done</div>
            </CardContent>
          </Card>
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
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10"></TableHead>
                <TableHead>Task</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[140px]">Category</TableHead>
                <TableHead className="w-[100px]">Due</TableHead>
                <TableHead className="w-[120px]">Assignee</TableHead>
                <TableHead className="w-[80px]">Timer</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-12 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8" />
                      <span>No tasks found</span>
                      <Button variant="outline" size="sm" onClick={() => setShowAddTask(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Create your first task
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    categories={categories}
                    onUpdate={(id, data) => updateTaskMutation.mutate({ id, data })}
                    onDelete={(id) => deleteTaskMutation.mutate(id)}
                    onStart={(id) => startTaskMutation.mutate(id)}
                    onComplete={(id) => completeTaskMutation.mutate(id)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </Card>
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
    </MainLayout>
  );
}
