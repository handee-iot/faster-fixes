"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useQuery } from "@tanstack/react-query";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

const formatEur = (value: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    value,
  );

export function LifetimeRevenueCard() {
  const trpc = useTRPC();
  const query = useQuery(
    trpc.admin.dashboard.getLifetimeRevenue.queryOptions(),
  );

  return matchQueryStatus(query, {
    Loading: <LifetimeRevenueCardLoading />,
    Errored: <LifetimeRevenueCardError />,
    Empty: <LifetimeRevenueCardLoading />,
    Success: ({ data }) => (
      <Card>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatEur(data.grossRevenue)}
          </div>
          <p className="text-xs text-muted-foreground">Gross revenue</p>
          <p className="text-xs text-muted-foreground">
            {formatEur(data.netRevenue)} net
          </p>
        </CardContent>
      </Card>
    ),
  });
}

function LifetimeRevenueCardLoading() {
  return (
    <Card>
      <CardContent>
        <Skeleton className="h-8 w-24" />
        <p className="text-xs text-muted-foreground">Gross revenue</p>
        <Skeleton className="mt-1 h-4 w-20" />
      </CardContent>
    </Card>
  );
}

function LifetimeRevenueCardError() {
  return (
    <Card className="border-destructive/50">
      <CardContent className="pt-6">
        <p className="text-sm text-destructive">Failed to load statistics</p>
      </CardContent>
    </Card>
  );
}
