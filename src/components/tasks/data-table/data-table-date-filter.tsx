"use client"

import * as React from "react"
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { CalendarIcon, X } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

interface DateRangeFilterProps {
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
}

const presets = [
  {
    label: "Today",
    getValue: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: "Yesterday",
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 1)),
      to: endOfDay(subDays(new Date(), 1)),
    }),
  },
  {
    label: "This Week",
    getValue: () => ({
      from: startOfWeek(new Date(), { weekStartsOn: 1 }),
      to: endOfWeek(new Date(), { weekStartsOn: 1 }),
    }),
  },
  {
    label: "Last 7 Days",
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: "This Month",
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: "Last 30 Days",
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 29)),
      to: endOfDay(new Date()),
    }),
  },
]

export function DataTableDateFilter({
  dateRange,
  onDateRangeChange,
}: DateRangeFilterProps) {
  const [open, setOpen] = React.useState(false)

  const label = React.useMemo(() => {
    if (!dateRange?.from) return "Due Date"

    // Check if it matches a single day
    if (dateRange.from && dateRange.to) {
      const fromStr = format(dateRange.from, "yyyy-MM-dd")
      const toStr = format(dateRange.to, "yyyy-MM-dd")
      if (fromStr === toStr) {
        return format(dateRange.from, "MMM d, yyyy")
      }
      return `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d, yyyy")}`
    }

    return format(dateRange.from, "MMM d, yyyy")
  }, [dateRange])

  const hasValue = !!dateRange?.from

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 border-dashed justify-start text-left font-normal",
              !hasValue && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="size-4" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Presets sidebar */}
            <div className="flex flex-col gap-0.5 border-r p-2 w-36">
              <p className="px-2 pt-1 pb-2 text-xs font-medium text-muted-foreground">
                Quick select
              </p>
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="justify-start h-7 text-xs font-normal"
                  onClick={() => {
                    onDateRangeChange(preset.getValue())
                    setOpen(false)
                  }}
                >
                  {preset.label}
                </Button>
              ))}
              <Separator className="my-1" />
              <Button
                variant="ghost"
                size="sm"
                className="justify-start h-7 text-xs font-normal text-muted-foreground"
                onClick={() => {
                  onDateRangeChange(undefined)
                  setOpen(false)
                }}
              >
                Clear
              </Button>
            </div>

            {/* Calendar */}
            <div className="p-2">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => {
                  if (range) {
                    // When user clicks a single day, set both from and to
                    onDateRangeChange({
                      from: range.from ? startOfDay(range.from) : undefined,
                      to: range.to ? endOfDay(range.to) : range.from ? endOfDay(range.from) : undefined,
                    })
                  } else {
                    onDateRangeChange(undefined)
                  }
                }}
                numberOfMonths={2}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {hasValue && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-6"
          onClick={() => onDateRangeChange(undefined)}
        >
          <X className="size-3.5" />
          <span className="sr-only">Clear date filter</span>
        </Button>
      )}
    </div>
  )
}
