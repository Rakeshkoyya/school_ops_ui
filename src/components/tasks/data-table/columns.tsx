"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import {
  Circle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PlayCircle,
  Zap,
  User,
  Tag,
  Check,
  RotateCcw,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import type { Task, TaskStatus, TaskCategory, StaffMember } from "@/types"
import { DataTableColumnHeader } from "./data-table-column-header"
import { DataTableRowActions } from "./data-table-row-actions"

// ─── Status config ──────────────────────────────────────────────────────────

export const statusConfig: Record<
  TaskStatus,
  {
    label: string
    icon: React.ComponentType<{ className?: string }>
    color: string
    bgColor: string
    headerBg: string
  }
> = {
  pending: {
    label: "To Do",
    icon: Circle,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
    headerBg: "#D97706",
  },
  in_progress: {
    label: "In Progress",
    icon: PlayCircle,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
    headerBg: "#3B82F6",
  },
  done: {
    label: "Done",
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
    headerBg: "#22C55E",
  },
  overdue: {
    label: "Overdue",
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
    headerBg: "#EF4444",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    color: "text-gray-500 dark:text-gray-400",
    bgColor: "bg-gray-50 border-gray-200 dark:bg-gray-800/30 dark:border-gray-700",
    headerBg: "#9CA3AF",
  },
}

// ─── Countdown Timer Cell ───────────────────────────────────────────────────

function CountdownTimerCell({
  dueDate,
  status,
  completedAt,
}: {
  dueDate: string
  status?: string
  completedAt?: string | null
}) {
  const [remaining, setRemaining] = useState(0)
  const isDone = status === "done"

  useEffect(() => {
    const dueDateObj = new Date(dueDate)
    const dueTimestamp = dueDateObj.getTime()

    if (isDone && completedAt) {
      const completedTimestamp = new Date(completedAt).getTime()
      const diff = Math.floor((dueTimestamp - completedTimestamp) / 1000)
      setRemaining(diff)
      return
    }

    const updateRemaining = () => {
      const now = Date.now()
      const diff = Math.floor((dueTimestamp - now) / 1000)
      setRemaining(diff)
    }

    updateRemaining()
    const interval = setInterval(updateRemaining, 1000)
    return () => clearInterval(interval)
  }, [dueDate, isDone, completedAt])

  const isOverdue = remaining < 0
  const absRemaining = Math.abs(remaining)

  const days = Math.floor(absRemaining / 86400)
  const hours = Math.floor((absRemaining % 86400) / 3600)
  const minutes = Math.floor((absRemaining % 3600) / 60)
  const seconds = absRemaining % 60

  let display = ""
  if (days > 0) {
    display = `${days}d ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  } else {
    display = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  return (
    <span
      className={cn(
        "text-xs font-mono tabular-nums",
        isDone
          ? isOverdue
            ? "text-red-400"
            : "text-green-600"
          : isOverdue
            ? "text-red-600"
            : "text-muted-foreground"
      )}
    >
      {isDone && !isOverdue && "✓ "}
      {isOverdue ? "-" : ""}
      {display}
      {isDone && isOverdue && " (late)"}
    </span>
  )
}

// ─── Evo Points Cell ────────────────────────────────────────────────────────

function EvoPointsCell({ task }: { task: Task }) {
  const [currentPoints, setCurrentPoints] = useState<number | null>(null)

  const maxPoints = task.evo_points
  const isDone = task.status === "done"

  useEffect(() => {
    if (!maxPoints || maxPoints <= 0) {
      setCurrentPoints(null)
      return
    }

    if (isDone) {
      setCurrentPoints(task.earned_evo_points ?? task.evo_points ?? 0)
      return
    }

    const calculatePoints = () => {
      const now = new Date()
      const dueDateTime = task.due_datetime ? new Date(task.due_datetime) : null

      if (!dueDateTime || now <= dueDateTime) {
        setCurrentPoints(maxPoints)
        return
      }

      const reductionType = task.evo_reduction_type

      if (reductionType === "NONE" || !reductionType) {
        setCurrentPoints(maxPoints)
        return
      }

      if (reductionType === "GRADUAL") {
        const extensionEnd = task.evo_extension_end
          ? new Date(task.evo_extension_end)
          : null

        if (!extensionEnd) {
          setCurrentPoints(0)
          return
        }

        if (now >= extensionEnd) {
          setCurrentPoints(0)
          return
        }

        const totalDecayMs = extensionEnd.getTime() - dueDateTime.getTime()
        const elapsedMs = now.getTime() - dueDateTime.getTime()

        if (totalDecayMs <= 0) {
          setCurrentPoints(0)
          return
        }

        const remainingRatio = 1 - elapsedMs / totalDecayMs
        setCurrentPoints(Math.max(0, Math.floor(maxPoints * remainingRatio)))
        return
      }

      if (reductionType === "FIXED") {
        const fixedReduction = task.evo_fixed_reduction_points ?? 0
        const extensionEnd = task.evo_extension_end
          ? new Date(task.evo_extension_end)
          : null
        const reducedPoints = Math.max(0, maxPoints - fixedReduction)

        if (!extensionEnd) {
          setCurrentPoints(reducedPoints)
          return
        }

        if (now >= extensionEnd) {
          setCurrentPoints(0)
          return
        }

        setCurrentPoints(reducedPoints)
        return
      }

      setCurrentPoints(maxPoints)
    }

    calculatePoints()
    const interval = setInterval(calculatePoints, 1000)
    return () => clearInterval(interval)
  }, [
    task.due_datetime,
    task.evo_reduction_type,
    task.evo_extension_end,
    task.evo_fixed_reduction_points,
    task.earned_evo_points,
    maxPoints,
    isDone,
  ])

  if (!maxPoints || maxPoints <= 0) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  if (currentPoints === null) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  if (isDone) {
    return (
      <div className="flex items-center gap-1.5">
        <Zap className="size-3.5 text-emerald-500" />
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          +{currentPoints}
        </span>
      </div>
    )
  }

  const isReduced = currentPoints < maxPoints

  return (
    <div className="flex items-center gap-1.5">
      <Zap className={cn("size-3.5", isReduced ? "text-amber-500" : "text-primary")} />
      <span className={cn("font-semibold tabular-nums", isReduced && "text-amber-600 dark:text-amber-400")}>
        {currentPoints}
      </span>
      {isReduced && (
        <span className="text-xs text-muted-foreground line-through">
          {maxPoints}
        </span>
      )}
    </div>
  )
}

// ─── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({
  status,
  isOverdue,
}: {
  status: TaskStatus
  isOverdue?: boolean
}) {
  const displayStatus = isOverdue && status !== "done" && status !== "cancelled" ? "overdue" : status
  const config = statusConfig[displayStatus]

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-medium cursor-pointer", config.bgColor, config.color)}
    >
      <config.icon className="size-3.5" />
      {config.label}
    </Badge>
  )
}

// ─── Column definitions ─────────────────────────────────────────────────────

interface ColumnOptions {
  categories?: TaskCategory[]
  staffList?: StaffMember[]
  isAdmin?: boolean
  onUpdate?: (id: number, data: Partial<Task>) => void
  onStart?: (id: number) => void
  onComplete?: (id: number) => void
  onDelete?: (id: number) => void
  onRevert?: (id: number, targetStatus: "pending" | "in_progress") => void
  onCancel?: (id: number) => void
}

export function getColumns(options: ColumnOptions = {}): ColumnDef<Task>[] {
  const { categories = [], staffList, isAdmin, onUpdate, onStart, onComplete, onDelete, onRevert, onCancel } = options

  return [
    // ── Complete Toggle ─────────────────────────────────────────────
    {
      id: "complete",
      header: () => <span className="sr-only">Done</span>,
      cell: ({ row }) => {
        const task = row.original
        const isDone = task.status === "done"
        
        return (
          <Checkbox
            checked={isDone}
            onCheckedChange={(checked) => {
              if (checked) {
                onComplete?.(task.id)
              } else {
                onRevert?.(task.id, "pending")
              }
            }}
            aria-label={isDone ? "Mark as not done" : "Mark as done"}
            className="translate-y-0.5"
          />
        )
      },
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },

    // ── Title + Description ─────────────────────────────────────────
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Task" />
      ),
      cell: ({ row }) => {
        const title = row.getValue("title") as string
        const description = row.original.description
        const isCompleted = row.original.status === "done"

        return (
          <div className="flex space-x-2 min-w-0 max-w-[350px]">
            <div className="flex flex-col min-w-0 w-full">
              <span
                className={cn(
                  "font-medium truncate block",
                  isCompleted && "line-through text-muted-foreground"
                )}
                title={title}
              >
                {title}
              </span>
              {description && (
                <span 
                  className="text-xs text-muted-foreground truncate block"
                  title={description}
                >
                  {description}
                </span>
              )}
            </div>
          </div>
        )
      },
      enableHiding: false,
      size: 350,
    },

    // ── Status (clickable dropdown) ─────────────────────────────────
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const task = row.original
        const isDone = task.status === "done"
        const isCancelled = task.status === "cancelled"

        // Check if overdue and due date was before today (for cancel option)
        const isOverduePastDay = task.is_overdue && task.due_datetime
          ? new Date(task.due_datetime).toDateString() !== new Date().toDateString()
          : false

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none">
                <StatusBadge status={task.status} isOverdue={task.is_overdue} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {task.status === "pending" && !task.is_overdue && (
                <DropdownMenuItem onClick={() => onStart?.(task.id)}>
                  <PlayCircle className="size-3.5 mr-2 text-blue-600" />
                  Start Task
                </DropdownMenuItem>
              )}
              {(task.status === "pending" || task.status === "in_progress") && (
                <DropdownMenuItem onClick={() => onComplete?.(task.id)}>
                  <CheckCircle2 className="size-3.5 mr-2 text-emerald-600" />
                  Complete Task
                </DropdownMenuItem>
              )}
              {isOverduePastDay && (
                <DropdownMenuItem onClick={() => onCancel?.(task.id)}>
                  <XCircle className="size-3.5 mr-2 text-red-600" />
                  Cancel Task
                </DropdownMenuItem>
              )}
              {isDone && (
                <>
                  <DropdownMenuItem onClick={() => onRevert?.(task.id, "pending")}>
                    <RotateCcw className="size-3.5 mr-2 text-orange-600" />
                    Revert to To Do
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRevert?.(task.id, "in_progress")}>
                    <RotateCcw className="size-3.5 mr-2 text-blue-600" />
                    Revert to In Progress
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      size: 140,
    },

    // ── Category (clickable dropdown) ───────────────────────────────
    {
      accessorKey: "category_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Category" />
      ),
      cell: ({ row }) => {
        const task = row.original

        if (!isAdmin) {
          if (task.category_name) {
            return (
              <Badge variant="secondary" className="font-normal">
                <Tag className="size-3 mr-1" />
                {task.category_name}
              </Badge>
            )
          }
          return <span className="text-muted-foreground">—</span>
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none">
                {task.category_name ? (
                  <Badge variant="secondary" className="font-normal cursor-pointer">
                    <Tag className="size-3 mr-1" />
                    {task.category_name}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                    + Add
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() =>
                  onUpdate?.(task.id, { category_id: undefined } as any)
                }
              >
                <span className="text-muted-foreground">No category</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {categories.map((cat) => (
                <DropdownMenuItem
                  key={cat.id}
                  onClick={() =>
                    onUpdate?.(task.id, { category_id: cat.id } as any)
                  }
                >
                  <Tag className="size-3.5 mr-2 text-muted-foreground" />
                  {cat.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      size: 150,
    },

    // ── Assignee (command popover for admin, static for staff) ──────
    {
      accessorKey: "assigned_user_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Assignee" />
      ),
      cell: ({ row }) => {
        const task = row.original

        if (isAdmin && staffList) {
          return <AssigneeCell task={task} staffList={staffList} onUpdate={onUpdate} />
        }

        if (task.assigned_user_name) {
          return (
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="size-3.5" />
              </div>
              <span className="text-sm">{task.assigned_user_name}</span>
            </div>
          )
        }

        return <span className="text-muted-foreground">Unassigned</span>
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      size: 170,
    },

    // ── Due Date ────────────────────────────────────────────────────
    {
      accessorKey: "due_datetime",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Due Date" />
      ),
      cell: ({ row }) => {
        const dueDate = row.getValue("due_datetime") as string | undefined
        if (!dueDate) return <span className="text-muted-foreground">—</span>

        const date = new Date(dueDate)
        const isOverdue = row.original.is_overdue

        return (
          <span className={cn("text-sm", isOverdue && "text-red-600 font-medium")}>
            {format(date, "MMM d, yyyy h:mm a")}
          </span>
        )
      },
      filterFn: (row, id, filterValue: [Date, Date] | undefined) => {
        if (!filterValue) return true
        const dueDate = row.getValue(id) as string | undefined
        if (!dueDate) return false
        const date = new Date(dueDate)
        const [from, to] = filterValue
        return date >= from && date <= to
      },
      size: 180,
    },

    // ── Evo Points ──────────────────────────────────────────────────
    {
      accessorKey: "current_reward_points",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Evo Points" />
      ),
      cell: ({ row }) => <EvoPointsCell task={row.original} />,
      size: 100,
    },

    // ── Created At ──────────────────────────────────────────────────
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => {
        const dateStr = row.getValue("created_at") as string
        return (
          <span className="text-sm text-muted-foreground">
            {format(new Date(dateStr), "MMM d, yyyy")}
          </span>
        )
      },
      size: 120,
    },

    // ── Created By ──────────────────────────────────────────────────
    {
      accessorKey: "created_by_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created By" />
      ),
      cell: ({ row }) => {
        const name = row.getValue("created_by_name") as string | undefined
        if (!name) return <span className="text-xs text-muted-foreground">—</span>

        return (
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
              {name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm">{name}</span>
          </div>
        )
      },
      size: 130,
    },

    // ── Timer ───────────────────────────────────────────────────────
    {
      id: "timer",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Timer" />
      ),
      cell: ({ row }) => {
        const task = row.original
        if (!task.due_datetime) {
          return <span className="text-xs text-muted-foreground">—</span>
        }
        return (
          <CountdownTimerCell
            dueDate={task.due_datetime}
            status={task.status}
            completedAt={task.end_time}
          />
        )
      },
      enableSorting: false,
      size: 130,
    },

    // ── Actions ─────────────────────────────────────────────────────
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onStart={onStart}
          onComplete={onComplete}
          onDelete={onDelete}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 50,
    },
  ]
}

// ─── Assignee Cell (extracted due to useState) ──────────────────────────────

function AssigneeCell({
  task,
  staffList,
  onUpdate,
}: {
  task: Task
  staffList: StaffMember[]
  onUpdate?: (id: number, data: Partial<Task>) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="focus:outline-none text-left">
          {task.assigned_user_name ? (
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="size-3.5" />
              </div>
              <span className="text-sm hover:text-blue-600">
                {task.assigned_user_name}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground hover:text-blue-600 cursor-pointer">
              + Assign
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-62 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search staff..." />
          <CommandList>
            <CommandEmpty>No staff found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__unassign__"
                onSelect={() => {
                  onUpdate?.(task.id, { assigned_to_user_id: undefined } as any)
                  setOpen(false)
                }}
              >
                <span className="text-muted-foreground">Unassign</span>
              </CommandItem>
              {staffList.map((staff) => (
                <CommandItem
                  key={staff.id}
                  value={staff.name}
                  onSelect={() => {
                    onUpdate?.(task.id, { assigned_to_user_id: staff.id } as any)
                    setOpen(false)
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="size-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm">{staff.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {staff.email}
                      </span>
                    </div>
                  </div>
                  {task.assigned_to_user_id === staff.id && (
                    <Check className="ml-auto size-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─── Filter option generators ───────────────────────────────────────────────

export const statusFilterOptions = Object.entries(statusConfig)
  .filter(([key]) => key !== "overdue") // overdue is derived, not a user-selectable status
  .map(([value, config]) => ({
    label: config.label,
    value,
    icon: config.icon,
  }))

export function getCategoryFilterOptions(tasks: Task[]) {
  const categories = new Map<string, string>()
  tasks.forEach((task) => {
    if (task.category_name) {
      categories.set(task.category_name, task.category_name)
    }
  })
  return Array.from(categories.values()).map((name) => ({
    label: name,
    value: name,
  }))
}

export function getAssigneeFilterOptions(tasks: Task[]) {
  const assignees = new Map<string, string>()
  tasks.forEach((task) => {
    if (task.assigned_user_name) {
      assignees.set(task.assigned_user_name, task.assigned_user_name)
    }
  })
  return Array.from(assignees.values()).map((name) => ({
    label: name,
    value: name,
  }))
}
