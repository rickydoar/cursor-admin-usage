"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartConfig, ChartTooltipContent } from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"

type SpendBucketDatum = {
  bucket: string
  users: number
}

type Props = {
  fetchDistribution?: (days: number) => Promise<SpendBucketDatum[]>
  initialDays?: 7 | 14 | 30
}

const chartConfig: ChartConfig = {
  users: { label: "Users", color: "--chart-2" },
}

function buildBucketLabels(step: number, max: number): string[] {
  const labels: string[] = []
  for (let start = 0; start < max; start += step) {
    const end = start + step
    labels.push(`$${start}–${end}`)
  }
  return labels
}

function generateMockDistribution(days: number): SpendBucketDatum[] {
  const step = 20
  const max = 1000
  const labels = buildBucketLabels(step, max)
  const scale = days / 30 // 7→~0.23, 14→~0.47, 30→1

  // Exponentially decaying distribution: more users in lower spend buckets
  const baseAtZero = 450
  const decay = 1 / 250 // controls how fast counts fall as spend increases

  return labels.map((label, idx) => {
    const start = idx * step
    const mid = start + step / 2
    const mean = baseAtZero * Math.exp(-mid * decay) * (0.6 + scale * 0.7)
    const noise = (Math.random() - 0.5) * Math.max(6, mean * 0.08)
    const value = Math.max(0, Math.round(mean + noise))
    return { bucket: label, users: value }
  })
}

export default function SpendDistributionChart({ fetchDistribution, initialDays = 30 }: Props) {
  const [days, setDays] = React.useState<7 | 14 | 30>(initialDays)
  const [data, setData] = React.useState<SpendBucketDatum[]>([])
  const [loading, setLoading] = React.useState(false)
  const [selectedBucket, setSelectedBucket] = React.useState<string | null>(null)
  const [selectedBucketTotal, setSelectedBucketTotal] = React.useState<number>(0)
  const [selectedUsers, setSelectedUsers] = React.useState<Array<{ email: string; spend: number }>>([])
  const [selectedUser, setSelectedUser] = React.useState<{ email: string; spend: number } | null>(null)
  const [selectedUserStats, setSelectedUserStats] = React.useState<
    | {
        agentRequests: number
        linesGenerated: number
        linesAccepted: number
        tabCompletionsAccepted: number
        modelUsage: Array<{ model: string; percent: number }>
      }
    | null
  >(null)
  const detailsRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const result = fetchDistribution ? await fetchDistribution(days) : generateMockDistribution(days)
        if (!cancelled) setData(result)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [days, fetchDistribution])

  React.useEffect(() => {
    // Clear selection when days change or data reloads
    setSelectedBucket(null)
    setSelectedBucketTotal(0)
    setSelectedUsers([])
    setSelectedUser(null)
    setSelectedUserStats(null)
  }, [days])

  // Scroll to user details when they are shown
  React.useEffect(() => {
    if (selectedUser && selectedUserStats && detailsRef.current) {
      // Wait a tick to ensure the element is in the DOM and laid out
      requestAnimationFrame(() => {
        detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    }
  }, [selectedUser, selectedUserStats])

  function parseBucket(label: string): { min: number; max: number } | null {
    // Supports both hyphen and en dash between values
    const match = label.match(/\$(\d+)[–-](\d+)/)
    if (!match) return null
    const min = Number(match[1])
    const max = Number(match[2])
    return { min, max }
  }

  function generateUsersForBucket(label: string, totalUsers: number): Array<{ email: string; spend: number }> {
    const range = parseBucket(label)
    if (!range) return []
    const { min, max } = range
    const toShow = Math.min(50, Math.max(1, totalUsers))
    const users: Array<{ email: string; spend: number }> = []
    for (let i = 0; i < toShow; i++) {
      const spend = Number((min + Math.random() * (max - min)).toFixed(2))
      const email = `user${Math.floor(Math.random() * 900000 + 100000)}@example.com`
      users.push({ email, spend })
    }
    users.sort((a, b) => b.spend - a.spend)
    return users
  }

  function handleBucketClick(bucketLabel: string, totalUsers: number) {
    setSelectedBucket(bucketLabel)
    setSelectedBucketTotal(totalUsers)
    setSelectedUsers(generateUsersForBucket(bucketLabel, totalUsers))
    setSelectedUser(null)
    setSelectedUserStats(null)
  }

  // Deterministic generators for stable per-user stats
  function hashStringToInt(input: string): number {
    let hash = 2166136261
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i)
      hash = Math.imul(hash, 16777619)
    }
    return hash >>> 0
  }

  function mulberry32(seed: number) {
    let t = seed >>> 0
    return function () {
      t += 0x6D2B79F5
      let r = Math.imul(t ^ (t >>> 15), 1 | t)
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296
    }
  }

  function generateUserStats(email: string, spend: number, bucketLabel: string | null) {
    const range = bucketLabel ? parseBucket(bucketLabel) : null
    const maxBench = range ? range.max : 1000
    const spendFactor = Math.min(1, Math.max(0.05, spend / Math.max(1, maxBench)))

    const prng = mulberry32(hashStringToInt(email))

    const agentRequestsBase = 100 + spendFactor * 4000
    const agentRequests = Math.max(1, Math.round(agentRequestsBase * (0.8 + prng() * 0.4)))

    const linesGeneratedBase = agentRequests * (8 + prng() * 12)
    const linesGenerated = Math.round(linesGeneratedBase * (0.9 + spendFactor * 0.6))
    const acceptanceRate = 0.45 + spendFactor * 0.4 + (prng() - 0.5) * 0.06
    const linesAccepted = Math.min(linesGenerated, Math.max(0, Math.round(linesGenerated * acceptanceRate)))

    const tabCompletionsAccepted = Math.max(0, Math.round((200 + spendFactor * 6000) * (0.7 + prng() * 0.6)))

    const wGpt5 = 1.0 + prng() * 0.6 + (1 - spendFactor) * 1.2
    const wSonnet = 1.0 + prng() * 0.6 + spendFactor * 0.8
    const wOpus = 1.0 + prng() * 0.6 + spendFactor * 2.8
    const wAuto = 0.8 + prng() * 0.6 + (1 - spendFactor) * 0.6
    const sum = wGpt5 + wSonnet + wOpus + wAuto
    const toPct = (w: number) => Math.round((w / sum) * 100)
    const modelUsage = [
      { model: "gpt-5", percent: toPct(wGpt5) },
      { model: "claude-4-sonnet", percent: toPct(wSonnet) },
      { model: "claude-4-opus", percent: toPct(wOpus) },
      { model: "auto", percent: toPct(wAuto) },
    ] as Array<{ model: string; percent: number }>
    const totalPct = modelUsage.reduce((s, m) => s + m.percent, 0)
    const diff = 100 - totalPct
    if (diff !== 0) {
      let idx = 0
      for (let i = 1; i < modelUsage.length; i++) if (modelUsage[i].percent > modelUsage[idx].percent) idx = i
      modelUsage[idx] = { ...modelUsage[idx], percent: modelUsage[idx].percent + diff }
    }

    return {
      agentRequests,
      linesGenerated,
      linesAccepted,
      tabCompletionsAccepted,
      modelUsage,
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">User spend distribution</CardTitle>
        <div className="flex items-center gap-1 rounded-md border p-1">
          {[7, 14, 30].map((d) => (
            <Button key={d} size="sm" variant={d === days ? "default" : "ghost"} onClick={() => setDays(d as 7 | 14 | 30)}>
              {d}d
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 12, right: 12, top: 12, bottom: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="bucket"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "currentColor" }}
                tickMargin={8}
                interval={4}
              />
              <YAxis
                width={42}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "currentColor" }}
              />
              <Tooltip
                cursor={{ fill: "transparent" }}
                content={({ active, payload, label }) => (
                  <ChartTooltipContent
                    active={active}
                    payload={payload as Array<{ value: number; name: string; color?: string; dataKey?: string }> | undefined}
                    label={label}
                    valueFormatter={(v) => `${v} users`}
                  />
                )}
              />
              <Bar
                dataKey="users"
                name={chartConfig.users.label}
                fill="var(--color-users)"
                radius={[4, 4, 0, 0]}
                isAnimationActive={!loading}
              >
                {data.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    cursor="pointer"
                    fill="var(--color-users)"
                    fillOpacity={selectedBucket === entry.bucket ? 1 : 0.8}
                    onClick={() => handleBucketClick(entry.bucket, entry.users)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
      {selectedBucket ? (
        <CardContent className="pt-0">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Users in bucket</div>
              <div className="text-base font-medium">{selectedBucket}</div>
            </div>
            <div className="text-sm text-muted-foreground">Showing {selectedUsers.length} of {selectedBucketTotal} users</div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Spend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedUsers.map((u, i) => (
                <TableRow
                  key={`${u.email}-${i}`}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    setSelectedUser(u)
                    setSelectedUserStats(generateUserStats(u.email, u.spend, selectedBucket))
                  }}
                >
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>${u.spend.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableCaption>Click another bar to view a different bucket.</TableCaption>
          </Table>
          {selectedUser && selectedUserStats ? (
            <div ref={detailsRef} className="mt-6 rounded-lg border p-4">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">User</div>
                  <div className="text-sm font-medium">{selectedUser.email}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Spend in bucket</div>
                  <div className="text-sm font-medium">${selectedUser.spend.toFixed(2)}</div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Agent requests</div>
                  <div className="text-lg font-semibold tabular-nums">{selectedUserStats.agentRequests.toLocaleString()}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Tab completions accepted</div>
                  <div className="text-lg font-semibold tabular-nums">{selectedUserStats.tabCompletionsAccepted.toLocaleString()}</div>
                </div>
                <div className="rounded-md border p-3 sm:col-span-2">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">Lines of code: generated vs accepted</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedUserStats.linesAccepted.toLocaleString()} / {selectedUserStats.linesGenerated.toLocaleString()} ({Math.round((selectedUserStats.linesAccepted / Math.max(1, selectedUserStats.linesGenerated)) * 100)}%)
                    </div>
                  </div>
                  <Progress value={(selectedUserStats.linesAccepted / Math.max(1, selectedUserStats.linesGenerated)) * 100} />
                </div>
                <div className="rounded-md border p-3 sm:col-span-2">
                  <div className="mb-2 text-xs text-muted-foreground">Model usage</div>
                  <div className="mb-2 flex h-3 w-full overflow-hidden rounded">
                    {selectedUserStats.modelUsage.map((m) => (
                      <div
                        key={m.model}
                        className="h-full"
                        style={{
                          width: `${m.percent}%`,
                          background:
                            m.model === "gpt-5"
                              ? `var(--chart-2)`
                              : m.model === "claude-4-sonnet"
                              ? `var(--chart-3)`
                              : m.model === "claude-4-opus"
                              ? `var(--chart-4)`
                              : `var(--chart-5)`,
                        }}
                        title={`${m.model}: ${m.percent}%`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                    {selectedUserStats.modelUsage.map((m) => (
                      <div key={m.model} className="flex items-center gap-2 whitespace-nowrap">
                        <span
                          className="inline-block size-2.5 rounded"
                          style={{
                            background:
                              m.model === "gpt-5"
                                ? `var(--chart-2)`
                                : m.model === "claude-4-sonnet"
                                ? `var(--chart-3)`
                                : m.model === "claude-4-opus"
                                ? `var(--chart-4)`
                                : `var(--chart-5)`,
                          }}
                        />
                        <span className="truncate">{m.model}</span>
                        <span className="ml-1 tabular-nums">{m.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button size="sm" variant="ghost" onClick={() => { setSelectedUser(null); setSelectedUserStats(null) }}>Clear</Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  )
}


