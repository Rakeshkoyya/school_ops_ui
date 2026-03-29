"use client"

import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Save, X } from "lucide-react"
import { DataTablePagination } from "./data-table-pagination"
import { DataTableToolbar } from "./data-table-toolbar"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  filterableColumns?: {
    id: string
    title: string
    options: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }[]
  }[]
  searchableColumns?: {
    id: string
    title: string
  }[]
  /** Column ID for date range filter (e.g., "due_datetime") */
  dateFilterColumnId?: string
  /** Optional slot for additional toolbar actions (e.g., create task button) */
  toolbarActions?: React.ReactNode
  /** Show inline editable row for creating new task */
  showNewTaskRow?: boolean
  /** Callback when user clicks save on new task row */
  onSaveNewTask?: (data: any) => void
  /** Callback when user cancels new task row */
  onCancelNewTask?: () => void
  /** Categories for the new task dropdown */
  categories?: Array<{ id: number; name: string }>
  /** Staff list for assignee dropdown */
  staffList?: Array<{ id: number; name: string }>
  /** Callback when New Task button is clicked in toolbar */
  onNewTaskClick?: () => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterableColumns = [],
  searchableColumns = [],
  dateFilterColumnId,
  toolbarActions,
  showNewTaskRow = false,
  onSaveNewTask,
  onCancelNewTask,
  categories = [],
  staffList = [],
  onNewTaskClick,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  
  // New task row state
  const [newTaskData, setNewTaskData] = React.useState({
    title: '',
    description: '',
    category_id: undefined as number | undefined,
    assigned_to_user_id: undefined as number | undefined,
    due_datetime: '',
  })

  const handleSaveNewTask = () => {
    if (newTaskData.title.trim() && onSaveNewTask) {
      onSaveNewTask(newTaskData)
      setNewTaskData({
        title: '',
        description: '',
        category_id: undefined,
        assigned_to_user_id: undefined,
        due_datetime: '',
      })
    }
  }

  const handleCancelNewTask = () => {
    setNewTaskData({
      title: '',
      description: '',
      category_id: undefined,
      assigned_to_user_id: undefined,
      due_datetime: '',
    })
    onCancelNewTask?.()
  }

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        filterableColumns={filterableColumns}
        searchableColumns={searchableColumns}
        dateFilterColumnId={dateFilterColumnId}
        onNewTaskClick={onNewTaskClick}
      >
        {toolbarActions}
      </DataTableToolbar>
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className="h-11 bg-muted/40 first:rounded-tl-lg last:rounded-tr-lg"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {/* New Task Editable Row */}
            {showNewTaskRow && (
              <TableRow className="bg-blue-50/50 border-b-2 border-blue-200">
                <TableCell className="w-[50px]"></TableCell>
                <TableCell className="min-w-[200px]">
                  <Input
                    placeholder="Task title..."
                    value={newTaskData.title}
                    onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                    className="h-8"
                    autoFocus
                  />
                </TableCell>
                <TableCell className="w-[130px]"></TableCell>
                <TableCell className="w-[150px]">
                  <Select
                    value={newTaskData.category_id?.toString() || "none"}
                    onValueChange={(v) => setNewTaskData({ ...newTaskData, category_id: v === "none" ? undefined : parseInt(v) })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="w-[150px]">
                  {staffList && staffList.length > 0 && (
                    <Select
                      value={newTaskData.assigned_to_user_id?.toString() || "none"}
                      onValueChange={(v) => setNewTaskData({ ...newTaskData, assigned_to_user_id: v === "none" ? undefined : parseInt(v) })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Myself</SelectItem>
                        {staffList.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id.toString()}>
                            {staff.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell className="w-[180px]">
                  <Input
                    type="datetime-local"
                    value={newTaskData.due_datetime}
                    onChange={(e) => setNewTaskData({ ...newTaskData, due_datetime: e.target.value })}
                    className="h-8"
                  />
                </TableCell>
                <TableCell className="w-[100px]"></TableCell>
                <TableCell className="w-[100px]"></TableCell>
                <TableCell className="w-[100px]"></TableCell>
                <TableCell className="w-[80px]"></TableCell>
                <TableCell className="w-[80px] text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={handleSaveNewTask}
                      disabled={!newTaskData.title.trim()}
                      className="h-7"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelNewTask}
                      className="h-7"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="group transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  No tasks found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  )
}
