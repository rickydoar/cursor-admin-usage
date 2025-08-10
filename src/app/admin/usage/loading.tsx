import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active users</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Usage pool remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-36" />
            </div>
            <Skeleton className="mt-3 h-2 w-full" />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <Skeleton className="mb-1 h-3 w-24" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div>
                <Skeleton className="mb-1 h-3 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
              <div>
                <Skeleton className="mb-1 h-3 w-24" />
                <Skeleton className="h-5 w-28" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      <section>
        <Skeleton className="mb-2 h-5 w-24" />
        <Skeleton className="h-4 w-80" />
      </section>
    </main>
  );
}


