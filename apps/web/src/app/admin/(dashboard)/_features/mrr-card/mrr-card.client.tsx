"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useQuery } from "@tanstack/react-query";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

const formatEur = (value: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    value,
  );

const formatSignedEur = (value: number) =>
  `${value > 0 ? "+" : ""}${formatEur(value)}`;

export function MrrCard() {
  const trpc = useTRPC();
  const query = useQuery(trpc.admin.dashboard.getBillingMetrics.queryOptions());

  return matchQueryStatus(query, {
    Loading: <MrrCardLoading />,
    Errored: <MrrCardError />,
    Empty: <MrrCardLoading />,
    Success: ({ data }) => {
      // Rounded to the cent so float noise never shows as a tiny change.
      const delta = Math.round((data.mrr - data.previous.mrr) * 100) / 100;

      return (
        <Card>
          <CardContent>
            <div className="text-2xl font-bold">{formatEur(data.mrr)}</div>
            <p className="text-xs text-muted-foreground">MRR, excluding VAT</p>
            <p
              className={cn(
                "text-xs font-medium",
                delta > 0 && "text-success",
                delta < 0 && "text-destructive",
                delta === 0 && "text-muted-foreground",
              )}
            >
              {formatSignedEur(delta)} vs 30 days ago
            </p>
            <p className="text-xs text-muted-foreground">
              {formatEur(data.arr)} ARR
            </p>
            {data.unpricedItemCount > 0 && (
              <p className="mt-2 text-xs text-destructive">
                {data.unpricedItemCount} subscription{" "}
                {data.unpricedItemCount === 1 ? "item" : "items"} without a flat
                EUR price, not counted
              </p>
            )}
          </CardContent>
        </Card>
      );
    },
  });
}

function MrrCardLoading() {
  return (
    <Card>
      <CardContent>
        <Skeleton className="h-8 w-24" />
        <p className="text-xs text-muted-foreground">MRR, excluding VAT</p>
        <Skeleton className="mt-1 h-4 w-20" />
      </CardContent>
    </Card>
  );
}

function MrrCardError() {
  return (
    <Card className="border-destructive/50">
      <CardContent className="pt-6">
        <p className="text-sm text-destructive">Failed to load statistics</p>
      </CardContent>
    </Card>
  );
}
