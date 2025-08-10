import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import dynamic from "next/dynamic";
import ThemeToggle from "@/components/ThemeToggle";

const UsageChart = dynamic(() => import("./UsageChart"));
const SpendDistributionChart = dynamic(() => import("./SpendDistributionChart"));

export const metadata: Metadata = {
  title: "Admin • Usage",
  description: "Cursor admin usage overview with active users and usage pool status.",
};

type UsageStats = {
  activeUsers: number;
  licenseCount: number; // contracted seats (must be <= activeUsers)
  totalPool: number; // total credits available in the global pool
  remainingPool: number; // remaining credits in the global pool
  renewalDate: string; // ISO date string when the pool renews
  averageDailySpend: number; // dollars per day burn rate
};

async function getUsageStats(): Promise<UsageStats> {
  // Placeholder server-side fetch. Replace with a real data source.
  // Example: const res = await fetch(process.env.API_URL + "/admin/usage", { cache: "no-store" })
  // return res.json()
  return {
    activeUsers: 1562,
    // Ensure license count is lower than active users for the mock
    licenseCount: Math.max(0, 1562 - 120),
    totalPool: 1_000_000,
    remainingPool: 732_450,
    renewalDate: (() => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth() + 8, 1);
      return next.toISOString();
    })(),
    // Mock average daily spend consistent with chart magnitude
    averageDailySpend: 4_000,
  };
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined).format(value);
}

export default async function AdminUsagePage() {
  const { activeUsers, licenseCount, totalPool, remainingPool, renewalDate, averageDailySpend } = await getUsageStats();
  const remainingPercent = Math.max(0, Math.min(100, Math.round((remainingPool / totalPool) * 100)));

  // Derived dates
  const now = new Date();
  const renewsOn = new Date(renewalDate);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntilRenewal = Math.max(0, Math.ceil((renewsOn.getTime() - now.getTime()) / msPerDay));

  const daysUntilRunOut = averageDailySpend > 0 ? Math.ceil(remainingPool / averageDailySpend) : Infinity;
  const projectedRunOutDate = isFinite(daysUntilRunOut)
    ? new Date(now.getTime() + daysUntilRunOut * msPerDay)
    : null;

  // Projected overage: how much spend will exceed remaining pool before renewal
  const projectedSpendUntilRenewal = averageDailySpend * daysUntilRenewal;
  const projectedOverageSpend = Math.max(0, Math.round(projectedSpendUntilRenewal - remainingPool));

  const formatDate = (d: Date) =>
    new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(d);

  // True-up cadence: every 3 months starting from contract start.
  // Work backwards from renewal (assume 12-month term) to derive the contract start.
  const contractStart = new Date(renewsOn);
  contractStart.setFullYear(contractStart.getFullYear() - 1);
  const trueUpMilestones: Date[] = [1, 2, 3, 4].map((q) => {
    const d = new Date(contractStart);
    d.setMonth(d.getMonth() + q * 3);
    return d;
  });
  const nextTrueUpDate = trueUpMilestones.find((d) => d.getTime() >= now.getTime()) ?? renewsOn;
  const projectedSeatsAdded = Math.max(0, activeUsers - licenseCount);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Usage</h1>
          <p className="text-sm text-muted-foreground">Overview of active seats and shared usage pool.</p>
        </div>
        <ThemeToggle />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active users (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatNumber(activeUsers)}</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-xs text-muted-foreground">License count</div>
                <div className="text-sm font-medium">{formatNumber(licenseCount)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Next true up date</div>
                <div className="text-sm font-medium">{formatDate(nextTrueUpDate)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Projected seats added</div>
                <div className="text-sm font-medium">{formatNumber(projectedSeatsAdded)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Usage pool remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold">${formatNumber(remainingPool)}</div>
              <div className="text-sm text-muted-foreground">of ${formatNumber(totalPool)} ({remainingPercent}%)</div>
            </div>
            <div className="mt-3">
              <Progress value={remainingPercent} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-xs text-muted-foreground">Renews on</div>
                <div className="text-sm font-medium">{formatDate(renewsOn)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Projected run-out</div>
                <div className="text-sm font-medium">
                  {projectedRunOutDate ? formatDate(projectedRunOutDate) : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Projected additional spend</div>
                <div className="text-sm font-medium">${formatNumber(projectedOverageSpend)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Usage over time</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Dollars spent across all users in the selected period. Toggle between total or by-model segmentation.
        </p>
        <UsageChart />
      </section>

      <Separator className="my-8" />

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Spend distribution</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Number of users by dollars spent in the last 7/14/30 days across defined buckets.
        </p>
        <SpendDistributionChart />
      </section>
    </main>
  );
}


