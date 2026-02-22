"use client"

import { type Row } from "@tanstack/react-table"
import {
  MoreHorizontal,
  Play,
  CheckCircle2,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Task } from "@/types"

interface DataTableRowActionsProps {
  row: Row<Task>
  onStart?: (id: number) => void
  onComplete?: (id: number) => void
  onDelete?: (id: number) => void
}

export function DataTableRowActions({
  row,
  onStart,
  onComplete,
  onDelete,
}: DataTableRowActionsProps) {
  const task = row.original

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity"
        >
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-45">
        {task.status === "pending" && (
          <DropdownMenuItem onClick={() => onStart?.(task.id)}>
            <Play className="size-4" />
            Start Task
          </DropdownMenuItem>
        )}
        {task.status !== "done" && (
          <DropdownMenuItem onClick={() => onComplete?.(task.id)}>
            <CheckCircle2 className="size-4" />
            Complete
          </DropdownMenuItem>
        )}
        {(task.status === "pending" || task.status !== "done") && <DropdownMenuSeparator />}
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onDelete?.(task.id)}
        >
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
