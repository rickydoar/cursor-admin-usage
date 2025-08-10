"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type ChartSeriesConfig = {
  label?: string
  color: string // CSS variable token name, e.g. "hsl(var(--chart-1))" or "var(--color-chart-1)"
}

export type ChartConfig = Record<string, ChartSeriesConfig>

type ChartContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  config: ChartConfig
}

export function ChartContainer({ config, className, children, ...props }: ChartContainerProps) {
  // Build CSS variables for each configured series color to use in charts
  const cssVars: Record<string, string> = {}
  for (const [key, value] of Object.entries(config)) {
    const varName = `--color-${key}`
    // Allow passing just a token name like "--chart-1" or a full color value
    const colorValue = value.color.startsWith("--")
      ? `var(${value.color})`
      : value.color
    cssVars[varName] = colorValue
  }

  return (
    <div
      role="figure"
      className={cn("[&_.recharts-default-legend]:mt-2", className)}
      style={cssVars as React.CSSProperties}
      {...props}
    >
      {children}
    </div>
  )
}

export function ChartLegend({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-wrap items-center gap-3 text-xs", className)} {...props} />
}

type LegendItem = {
  id: string
  label: string
  colorVar?: string
}

export function ChartLegendContent({ items, className }: { items: LegendItem[]; className?: string }) {
  return (
    <ChartLegend className={className}>
      {items.map((item) => (
        <div key={item.id} className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ background: item.colorVar ? `var(${item.colorVar})` : undefined }} />
          <span className="text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </ChartLegend>
  )
}

type TooltipValueFormatter = (value: number, name: string) => string

export function ChartTooltip({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-md border bg-popover p-2 text-xs shadow-sm", className)} {...props} />
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color?: string; dataKey?: string }>
  label?: React.ReactNode
  valueFormatter?: TooltipValueFormatter
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <ChartTooltip>
      {label ? <div className="mb-1 font-medium">{label}</div> : null}
      <div className="grid gap-1">
        {payload.map((entry, idx) => {
          const name = entry.name ?? String(entry.dataKey ?? idx)
          const colorVar = `--color-${entry.dataKey ?? name}`
          const value = typeof entry.value === "number" ? entry.value : Number(entry.value)
          const formatted = valueFormatter ? valueFormatter(value, name) : String(value)
          return (
            <div key={idx} className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: `var(${colorVar})` }} />
              <span className="text-muted-foreground">{name}</span>
              <span className="ml-auto font-medium tabular-nums">{formatted}</span>
            </div>
          )
        })}
      </div>
    </ChartTooltip>
  )
}


