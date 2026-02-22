"use client"

import * as React from "react"
import { type Table } from "@tanstack/react-table"
import { X, SlidersHorizontal } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DataTableFacetedFilter } from "./data-table-faceted-filter"
import { DataTableDateFilter } from "./data-table-date-filter"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  filterableColumns?: {
    id: string
    title: string
    options: {
      label: string
      value: string
      icon?: React.ComponentType<{ className?: string }>
    }[]
  }[]
  searchableColumns?: {
    id: string
    title: string
  }[]
  /** Column ID for date range filter (e.g., "due_datetime") */
  dateFilterColumnId?: string
  children?: React.ReactNode
}

export function DataTableToolbar<TData>({
  table,
  filterableColumns = [],
  searchableColumns = [],
  dateFilterColumnId,
  children,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  // Date range state for the date filter
  const dateColumn = dateFilterColumnId ? table.getColumn(dateFilterColumnId) : undefined
  const dateRange = dateColumn?.getFilterValue() as DateRange | undefined

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {searchableColumns.length > 0 &&
          searchableColumns.map((column) =>
            table.getColumn(column.id) ? (
              <Input
                key={column.id}
                placeholder={`Search ${column.title}...`}
                value={
                  (table.getColumn(column.id)?.getFilterValue() as string) ?? ""
                }
                onChange={(event) =>
                  table.getColumn(column.id)?.setFilterValue(event.target.value)
                }
                className="h-8 w-37.5 lg:w-70"
              />
            ) : null
          )}
        {filterableColumns.length > 0 &&
          filterableColumns.map((column) =>
            table.getColumn(column.id) ? (
              <DataTableFacetedFilter
                key={column.id}
                column={table.getColumn(column.id)}
                title={column.title}
                options={column.options}
              />
            ) : null
          )}
        {dateColumn && (
          <DataTableDateFilter
            dateRange={dateRange}
            onDateRangeChange={(range) => {
              if (range?.from && range?.to) {
                dateColumn.setFilterValue([range.from, range.to])
              } else {
                dateColumn.setFilterValue(undefined)
              }
            }}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="size-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center space-x-2">
        {children}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto hidden h-8 lg:flex"
            >
              <SlidersHorizontal className="size-4" />
              View
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-52 p-3">
            <div className="space-y-1.5">
              <p className="text-sm font-medium leading-none">Toggle columns</p>
              <Separator />
              <div className="space-y-1">
                {table
                  .getAllColumns()
                  .filter(
                    (column) =>
                      typeof column.accessorFn !== "undefined" && column.getCanHide()
                  )
                  .map((column) => (
                    <div
                      key={column.id}
                      className="flex items-center space-x-2 rounded-sm px-1 py-1.5 hover:bg-accent"
                    >
                      <Checkbox
                        id={`col-vis-${column.id}`}
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      />
                      <Label
                        htmlFor={`col-vis-${column.id}`}
                        className="flex-1 cursor-pointer text-sm font-normal capitalize"
                      >
                        {column.id.replace(/_/g, " ")}
                      </Label>
                    </div>
                  ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
