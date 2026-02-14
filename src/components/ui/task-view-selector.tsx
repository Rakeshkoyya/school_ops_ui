'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  LayoutGrid, 
  Check, 
  Star, 
  Plus, 
  ChevronDown,
  Trash2,
  Edit3,
  GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useProject } from '@/contexts/project-context';
import { useAuth } from '@/contexts/auth-context';
import {
  getTaskViewStyles,
  getEffectiveView,
  setUserViewPreference,
  clearUserViewPreference,
  createTaskViewStyle,
  updateTaskViewStyle,
  deleteTaskViewStyle,
  setProjectDefaultView,
  getAvailableColumns,
  taskViewKeys,
} from '@/lib/task-views-api';
import type {
  TaskViewStyle,
  ColumnConfig,
  ColumnMetadata,
  CreateTaskViewStylePayload,
  EffectiveViewResponse,
} from '@/types';

// ==================== Types ====================

interface TaskViewSelectorProps {
  onViewChange?: (view: TaskViewStyle) => void;
}

// ==================== Draggable Header Item ====================

interface DraggableHeaderProps {
  column: ColumnConfig;
  label: string;
  widthPercent: number;
}

function DraggableHeader({ column, label, widthPercent }: DraggableHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.field });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: `${widthPercent}%`,
    minWidth: '60px',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-center gap-1 px-2 py-2 border-r last:border-r-0 bg-muted/50 cursor-grab active:cursor-grabbing select-none",
        isDragging && "shadow-lg bg-accent z-50 opacity-90"
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="text-xs font-medium truncate">{label}</span>
    </div>
  );
}

// ==================== Column Configuration Editor (Landscape) ====================

interface ColumnEditorProps {
  columns: ColumnConfig[];
  availableColumns: ColumnMetadata[];
  onChange: (columns: ColumnConfig[]) => void;
}

function ColumnEditor({ columns, availableColumns, onChange }: ColumnEditorProps) {
  // Get visible columns sorted by order
  const visibleColumns = [...columns]
    .filter(c => c.visible)
    .sort((a, b) => a.order - b.order);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getColumnLabel = (field: string) => {
    const meta = availableColumns.find(c => c.field === field);
    return meta?.label || field;
  };

  // Calculate width percentages for visible columns
  const getWidthPercent = (col: ColumnConfig): number => {
    if (!col.width || col.width === 'auto') {
      // Distribute remaining space equally among auto columns
      const autoColumns = visibleColumns.filter(c => !c.width || c.width === 'auto');
      const fixedTotal = visibleColumns
        .filter(c => c.width && c.width !== 'auto')
        .reduce((sum, c) => sum + parseFloat(c.width || '0'), 0);
      const remaining = Math.max(0, 100 - fixedTotal);
      return autoColumns.length > 0 ? remaining / autoColumns.length : 10;
    }
    return parseFloat(col.width);
  };

  const handleVisibilityToggle = (field: string) => {
    const col = columns.find(c => c.field === field);
    const meta = availableColumns.find(c => c.field === field);
    
    // If column not in array but exists in available columns, add it
    if (!col && meta) {
      // Use max of ALL columns' orders (not just visible) to avoid duplicates
      const maxOrder = columns.length > 0 ? Math.max(...columns.map(c => c.order)) : -1;
      const newColumns: ColumnConfig[] = [...columns, { field: meta.field, visible: true, order: maxOrder + 1 }];
      onChange(newColumns);
      return;
    }
    
    if (!col) return;
    
    // If making visible, assign unique order using max of ALL columns
    if (!col.visible) {
      const maxOrder = Math.max(...columns.map(c => c.order));
      const newColumns = columns.map(c =>
        c.field === field ? { ...c, visible: true, order: maxOrder + 1 } : c
      );
      onChange(newColumns);
    } else {
      // If hiding, just toggle visibility
      const newColumns = columns.map(c =>
        c.field === field ? { ...c, visible: false } : c
      );
      onChange(newColumns);
    }
  };

  const handleWidthChange = (field: string, widthPercent: number) => {
    const newColumns = columns.map(col =>
      col.field === field ? { ...col, width: `${widthPercent}` } : col
    );
    onChange(newColumns);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = visibleColumns.findIndex(c => c.field === active.id);
      const newIndex = visibleColumns.findIndex(c => c.field === over.id);
      
      // Reorder the visible columns
      const reordered = arrayMove(visibleColumns, oldIndex, newIndex);
      
      // Create a map of visible columns to their new order (0, 1, 2, ...)
      const visibleOrderMap = new Map(reordered.map((col, idx) => [col.field, idx]));
      
      // Hidden columns get orders starting after visible columns
      let hiddenOrderStart = reordered.length;
      
      const newColumns = columns.map(col => {
        if (visibleOrderMap.has(col.field)) {
          return { ...col, order: visibleOrderMap.get(col.field)! };
        }
        // Hidden column - assign unique order after all visible columns
        return { ...col, order: hiddenOrderStart++ };
      });
      
      onChange(newColumns);
    }
  };

  // Normalize widths to ensure they sum to 100%
  const normalizeWidths = () => {
    const total = visibleColumns.reduce((sum, col) => sum + getWidthPercent(col), 0);
    if (total === 0) return;
    
    const newColumns = columns.map(col => {
      if (!col.visible) return col;
      const currentPercent = getWidthPercent(col);
      const normalized = Math.round((currentPercent / total) * 100);
      return { ...col, width: `${normalized}` };
    });
    onChange(newColumns);
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Column Visibility Selection */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">Select Columns</Label>
          <p className="text-xs text-muted-foreground">
            Choose which columns to display in this view
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableColumns
            .filter(meta => meta.field !== 'description') // Description is part of title
            .map((meta) => {
              const col = columns.find(c => c.field === meta.field);
              const isVisible = col?.visible ?? meta.default_visible;
              return (
                <button
                  key={meta.field}
                  type="button"
                  onClick={() => handleVisibilityToggle(meta.field)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-full border transition-all",
                    isVisible
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-muted hover:bg-muted"
                  )}
                >
                  {meta.label}
                </button>
              );
            })}
        </div>
      </div>

      {/* Section 2: Column Order & Width Preview */}
      {visibleColumns.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Column Order & Width</Label>
              <p className="text-xs text-muted-foreground">
                Drag headers to reorder. Adjust width with sliders below.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={normalizeWidths}
            >
              Distribute Evenly
            </Button>
          </div>

          {/* Draggable Header Preview */}
          <div className="border rounded-lg overflow-hidden">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={visibleColumns.map(c => c.field)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex bg-muted/30 border-b">
                  {visibleColumns.map((col) => (
                    <DraggableHeader
                      key={col.field}
                      column={col}
                      label={getColumnLabel(col.field)}
                      widthPercent={getWidthPercent(col)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Width Adjustment Row */}
            <div className="flex bg-background p-2 gap-1">
              {visibleColumns.map((col) => (
                <div 
                  key={col.field} 
                  className="flex flex-col items-center gap-1"
                  style={{ 
                    width: `${getWidthPercent(col)}%`,
                    minWidth: '60px',
                  }}
                >
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={getWidthPercent(col)}
                    onChange={(e) => handleWidthChange(col.field, parseInt(e.target.value))}
                    className="w-full h-2 accent-primary cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground">
                    {Math.round(getWidthPercent(col))}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Total Width Indicator */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {visibleColumns.length} columns selected
            </span>
            <span className={cn(
              "font-medium",
              Math.abs(visibleColumns.reduce((sum, col) => sum + getWidthPercent(col), 0) - 100) < 1
                ? "text-green-600"
                : "text-amber-600"
            )}>
              Total: {Math.round(visibleColumns.reduce((sum, col) => sum + getWidthPercent(col), 0))}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== Create/Edit View Dialog ====================

interface ViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editView?: TaskViewStyle;
  availableColumns: ColumnMetadata[];
  onSave: (data: CreateTaskViewStylePayload) => void;
  isSaving: boolean;
}

function ViewDialog({ 
  open, 
  onOpenChange, 
  editView, 
  availableColumns,
  onSave,
  isSaving,
}: ViewDialogProps) {
  const [name, setName] = useState(editView?.name || '');
  const [description, setDescription] = useState(editView?.description || '');
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (editView?.column_config) {
      return editView.column_config;
    }
    // Default all columns visible with default order
    return availableColumns.map(col => ({
      field: col.field,
      visible: col.default_visible,
      order: col.default_order,
    }));
  });

  // Reset form when dialog opens/closes or editView changes
  React.useEffect(() => {
    if (open) {
      setName(editView?.name || '');
      setDescription(editView?.description || '');
      
      // Merge existing column_config with availableColumns to include any new columns
      const existingConfig = editView?.column_config || [];
      
      // Get max existing order to avoid conflicts
      const maxExistingOrder = existingConfig.length > 0 
        ? Math.max(...existingConfig.map(c => c.order))
        : -1;
      
      let nextOrder = maxExistingOrder + 1;
      
      const mergedColumns = availableColumns.map(meta => {
        const existing = existingConfig.find(c => c.field === meta.field);
        if (existing) {
          return existing;
        }
        // New column not in existing config - add with unique order (hidden)
        const newCol = {
          field: meta.field,
          visible: false,
          order: nextOrder++,
        };
        return newCol;
      });
      setColumns(mergedColumns);
    }
  }, [open, editView, availableColumns]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter a view name');
      return;
    }
    
    // Ensure at least one column is visible
    if (!columns.some(c => c.visible)) {
      toast.error('At least one column must be visible');
      return;
    }
    
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      column_config: columns,
    });
  };

  // Calculate dynamic width based on visible columns
  const visibleCount = columns.filter(c => c.visible).length;
  const dynamicWidth = Math.max(600, Math.min(visibleCount * 100 + 100, 1200));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="p-0 bg-transparent border-0 shadow-none max-w-none w-auto"
        style={{ maxWidth: '95vw' }}
      >
        <div 
          className="bg-background rounded-xl border shadow-2xl p-6 mx-auto"
          style={{ width: `${dynamicWidth}px`, maxWidth: '100%' }}
        >
          <DialogHeader className="pb-4 border-b mb-6">
            <DialogTitle className="text-xl">
              {editView ? 'Edit View' : 'Create View'}
            </DialogTitle>
            <DialogDescription>
              {editView 
                ? 'Modify the view configuration.'
                : 'Create a custom view with your preferred columns and layout.'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name and Description Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="view-name">View Name</Label>
                <Input
                  id="view-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Minimal View"
                  maxLength={100}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="view-description">Description (optional)</Label>
                <Input
                  id="view-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this view..."
                  maxLength={500}
                />
              </div>
            </div>
            
            {/* Column Configuration */}
            <ColumnEditor
              columns={columns}
              availableColumns={availableColumns}
              onChange={setColumns}
            />
            
            <DialogFooter className="pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : editView ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Main Component ====================

export function TaskViewSelector({ onViewChange }: TaskViewSelectorProps) {
  const { project, isProjectAdmin } = useProject();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingView, setEditingView] = useState<TaskViewStyle | undefined>();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [viewToDelete, setViewToDelete] = useState<TaskViewStyle | null>(null);

  // Fetch available columns
  const { data: columnsData } = useQuery({
    queryKey: taskViewKeys.columns(),
    queryFn: getAvailableColumns,
    staleTime: Infinity, // Columns don't change
    enabled: !!project?.id,
  });

  // Fetch all views for the project
  const { data: viewsData, isLoading: viewsLoading } = useQuery({
    queryKey: taskViewKeys.list(project?.id ?? null),
    queryFn: getTaskViewStyles,
    enabled: !!project?.id,
  });

  // Fetch effective view for current user
  const { data: effectiveData, isLoading: effectiveLoading } = useQuery({
    queryKey: taskViewKeys.effective(project?.id ?? null, 0), // userId will be from context
    queryFn: getEffectiveView,
    enabled: !!project?.id,
  });

  // Create view mutation
  const createMutation = useMutation({
    mutationFn: createTaskViewStyle,
    onSuccess: (newView) => {
      queryClient.invalidateQueries({ queryKey: taskViewKeys.lists() });
      toast.success('View created successfully');
      setViewDialogOpen(false);
      setEditingView(undefined);
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      toast.error(error.response?.data?.detail || 'Failed to create view');
    },
  });

  // Update view mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateTaskViewStylePayload }) =>
      updateTaskViewStyle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskViewKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskViewKeys.effective(project?.id ?? null, 0) });
      toast.success('View updated successfully');
      setViewDialogOpen(false);
      setEditingView(undefined);
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      toast.error(error.response?.data?.detail || 'Failed to update view');
    },
  });

  // Delete view mutation
  const deleteMutation = useMutation({
    mutationFn: deleteTaskViewStyle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskViewKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskViewKeys.effective(project?.id ?? null, 0) });
      toast.success('View deleted successfully');
      setDeleteConfirmOpen(false);
      setViewToDelete(null);
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      toast.error(error.response?.data?.detail || 'Failed to delete view');
    },
  });

  // Set user preference mutation
  const setPreferenceMutation = useMutation({
    mutationFn: setUserViewPreference,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskViewKeys.effective(project?.id ?? null, 0) });
      toast.success(`Switched to "${data.view_style.name}"`);
      onViewChange?.(data.view_style);
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      toast.error(error.response?.data?.detail || 'Failed to switch view');
    },
  });

  // Clear preference mutation
  const clearPreferenceMutation = useMutation({
    mutationFn: clearUserViewPreference,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskViewKeys.effective(project?.id ?? null, 0) });
      toast.success('Using project default view');
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      toast.error(error.response?.data?.detail || 'Failed to clear preference');
    },
  });

  // Set project default mutation
  const setDefaultMutation = useMutation({
    mutationFn: setProjectDefaultView,
    onSuccess: (view) => {
      queryClient.invalidateQueries({ queryKey: taskViewKeys.lists() });
      toast.success(`"${view.name}" set as project default`);
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      toast.error(error.response?.data?.detail || 'Failed to set default');
    },
  });

  const handleSaveView = (data: CreateTaskViewStylePayload) => {
    if (editingView) {
      updateMutation.mutate({ id: editingView.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleSelectView = (view: TaskViewStyle) => {
    setPreferenceMutation.mutate(view.id);
  };

  const handleEditView = (view: TaskViewStyle) => {
    setEditingView(view);
    setViewDialogOpen(true);
  };

  const handleDeleteView = (view: TaskViewStyle) => {
    setViewToDelete(view);
    setDeleteConfirmOpen(true);
  };

  const handleSetProjectDefault = (view: TaskViewStyle) => {
    setDefaultMutation.mutate(view.id);
  };

  const handleCreateNew = () => {
    setEditingView(undefined);
    setViewDialogOpen(true);
  };

  const currentView = effectiveData?.view;
  const views = viewsData?.views || [];
  const projectDefaultId = viewsData?.project_default_id;
  const availableColumns = columnsData?.columns || [];

  const canCreateView = hasPermission('task_view:create');
  const canSetDefault = hasPermission('task_view:set_default');

  if (viewsLoading || effectiveLoading) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <LayoutGrid className="h-4 w-4" />
        Loading...
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span className="max-w-[150px] truncate">
              {currentView?.name || 'Select View'}
            </span>
            {effectiveData?.source === 'user_preference' && (
              <Badge variant="secondary" className="ml-1 text-xs">
                Custom
              </Badge>
            )}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[280px]">
          {views.map((view) => {
            const isSelected = currentView?.id === view.id;
            const isProjectDefault = view.id === projectDefaultId;
            const isSystemDefault = view.is_system_default;
            const canEdit = !isSystemDefault && (view.created_by_id === undefined || hasPermission('task_view:update'));
            const canDelete = !isSystemDefault && (view.created_by_id === undefined || hasPermission('task_view:delete'));

            return (
              <DropdownMenuItem
                key={view.id}
                className="flex items-center justify-between p-2 cursor-pointer"
                onClick={() => handleSelectView(view)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  {!isSelected && <div className="w-4" />}
                  <span className="truncate">{view.name}</span>
                  {isProjectDefault && (
                    <Star className="h-3 w-3 text-yellow-500 shrink-0" fill="currentColor" />
                  )}
                </div>
                
                {(canEdit || canDelete || (canSetDefault && !isProjectDefault)) && (
                  <div className="flex items-center gap-1 ml-2">
                    {canEdit && !isSystemDefault && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditView(view);
                        }}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    )}
                    {canSetDefault && !isProjectDefault && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetProjectDefault(view);
                        }}
                        title="Set as project default"
                      >
                        <Star className="h-3 w-3" />
                      </Button>
                    )}
                    {canDelete && !isSystemDefault && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteView(view);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </DropdownMenuItem>
            );
          })}
          
          {effectiveData?.source === 'user_preference' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-muted-foreground"
                onClick={() => clearPreferenceMutation.mutate()}
              >
                Reset to project default
              </DropdownMenuItem>
            </>
          )}
          
          {canCreateView && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create New View
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create/Edit View Dialog */}
      <ViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        editView={editingView}
        availableColumns={availableColumns}
        onSave={handleSaveView}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete View</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{viewToDelete?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => viewToDelete && deleteMutation.mutate(viewToDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TaskViewSelector;
