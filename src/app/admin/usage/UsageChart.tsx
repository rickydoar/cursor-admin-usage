"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartConfig, ChartTooltipContent } from "@/components/ui/chart"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

type UsagePoint = {
  date: string // YYYY-MM-DD
  total: number
  [model: string]: number | string
}

type Props = {
  fetchUsage?: (days: number) => Promise<UsagePoint[]>
  initialDays?: number
}

const chartConfig: ChartConfig = {
  total: { label: "Total", color: "--chart-1" },
  "gpt-5": { label: "gpt-5", color: "--chart-2" },
  "claude-4-sonnet": { label: "claude-4-sonnet", color: "--chart-3" },
  "claude-4-opus": { label: "claude-4-opus", color: "--chart-4" },
  "auto": { label: "auto", color: "--chart-5" },
}

function generateMockData(days: number): UsagePoint[] {
  const result: UsagePoint[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const date = d.toISOString().slice(0, 10)
    const gpt5 = Math.max(0, Math.round(200 + Math.sin(i / 3) * 40 + (Math.random() - 0.5) * 30)) * 10
    const claudeSonnet = Math.max(0, Math.round(120 + Math.cos(i / 4) * 25 + (Math.random() - 0.5) * 20)) * 10
    const claudeOpus = Math.max(0, Math.round(80 + Math.sin(i / 5) * 15 + (Math.random() - 0.5) * 15)) * 10
    const auto = Math.max(0, Math.round(60 + Math.cos(i / 6) * 20 + (Math.random() - 0.5) * 12)) * 10
    const total = Number((gpt5 + claudeSonnet + claudeOpus + auto).toFixed(2))
    result.push({ date, total, "gpt-5": gpt5, "claude-4-sonnet": claudeSonnet, "claude-4-opus": claudeOpus, "auto": auto })
  }
  return result
}

export default function UsageChart({ fetchUsage, initialDays = 30 }: Props) {
  const [days, setDays] = React.useState(initialDays)
  const [view, setView] = React.useState<"total" | "models">("models")
  const [data, setData] = React.useState<UsagePoint[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const result = fetchUsage ? await fetchUsage(days) : generateMockData(days)
        if (!cancelled) setData(result)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [days, fetchUsage])

  const valueFormatter = React.useCallback((v: number) => `$${v.toFixed(2)}`, [])

  const activeKeys = view === "total" ? ["total"] : ["gpt-5", "claude-4-sonnet", "claude-4-opus", "auto"]

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">Usage dollars spent</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border p-1">
            {[7, 14, 30, 60, 90].map((d) => (
              <Button key={d} size="sm" variant={d === days ? "default" : "ghost"} onClick={() => setDays(d)}>
                {d}d
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-md border p-1">
            {(["total", "models"] as const).map((opt) => (
              <Button
                key={opt}
                size="sm"
                variant={opt === view ? "default" : "ghost"}
                onClick={() => setView(opt)}
              >
                {opt === "total" ? "Total" : "By model"}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 12, right: 12, top: 12, bottom: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "currentColor" }}
                tickMargin={8}
              />
              <YAxis
                width={42}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "currentColor" }}
                tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
              />
              <Tooltip
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                content={({ active, payload, label }) => (
                  <ChartTooltipContent
                    active={active}
                    payload={payload as Array<{ value: number; name: string; color?: string; dataKey?: string }> | undefined}
                    label={label}
                    valueFormatter={(v) => valueFormatter(Number(v))}
                  />
                )}
              />
              <Legend />
              {activeKeys.map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  dot={false}
                  stroke={`var(--color-${key})`}
                  strokeWidth={2}
                  name={chartConfig[key]?.label ?? key}
                  isAnimationActive={!loading}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}


