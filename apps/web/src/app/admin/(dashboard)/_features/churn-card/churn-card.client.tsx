"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useQuery } from "@tanstack/react-query";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

const formatRate = (rate: number) =>
  new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(rate);

export function ChurnCard() {
  const trpc = useTRPC();
  const query = useQuery(trpc.admin.dashboard.getBillingMetrics.queryOptions());

  return matchQueryStatus(query, {
    Loading: <ChurnCardLoading />,
    Errored: <ChurnCardError />,
    Empty: <ChurnCardLoading />,
    Success: ({ data }) => {
      const { churnedCount, base, rate } = data.churn;
      const scheduled = data.scheduledCancellationCount;

      return (
        <Card>
          <CardContent>
            <div className="text-2xl font-bold">
              {rate == null ? "N/A" : formatRate(rate)}
            </div>
            <p className="text-xs text-muted-foreground">
              Churn in the last 30 days
            </p>
            <p className="text-xs text-muted-foreground">
              {churnedCount} ended of {base} paying 30 days ago
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {scheduled} scheduled{" "}
              {scheduled === 1 ? "cancellation" : "cancellations"}
            </p>
          </CardContent>
        </Card>
      );
    },
  });
}

function ChurnCardLoading() {
  return (
    <Card>
      <CardContent>
        <Skeleton className="h-8 w-16" />
        <p className="text-xs text-muted-foreground">
          Churn in the last 30 days
        </p>
        <Skeleton className="mt-1 h-4 w-32" />
      </CardContent>
    </Card>
  );
}

function ChurnCardError() {
  return (
    <Card className="border-destructive/50">
      <CardContent className="pt-6">
        <p className="text-sm text-destructive">Failed to load statistics</p>
      </CardContent>
    </Card>
  );
}
